'use client'

import { useState, useEffect, useRef } from 'react'

const ff = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BLACK = '#0a0a0a'
const BORDER = '#e5e0e2'

// Global confirm/alert modal. Mounted once (root layout); shows a styled dialog
// in response to confirmDialog()/alertDialog() and resolves their promise.
export default function ConfirmHost() {
  const [cur, setCur] = useState(null) // { opts, resolve }
  const queue = useRef([])

  useEffect(() => {
    const onEvt = e => {
      setCur(prev => {
        if (prev) { queue.current.push(e.detail); return prev }
        return e.detail
      })
    }
    window.addEventListener('parlor-confirm', onEvt)
    return () => window.removeEventListener('parlor-confirm', onEvt)
  }, [])

  function close(result) {
    if (cur) { try { cur.resolve(result) } catch {} }
    const next = queue.current.shift()
    setCur(next || null)
  }

  useEffect(() => {
    if (!cur) return
    const onKey = e => { if (e.key === 'Escape') close(cur.opts.alert ? undefined : false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cur]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!cur) return null
  const o = cur.opts || {}
  const title = o.title || (o.alert ? '' : 'Are you sure?')
  const confirmText = o.confirmText || (o.alert ? 'OK' : 'Confirm')

  return (
    <div onClick={() => close(o.alert ? undefined : false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400, padding: '26px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }}>
        {title && <h3 style={{ fontFamily: ffH, fontSize: 20, margin: '0 0 8px', color: BLACK }}>{title}</h3>}
        <p style={{ fontFamily: ff, fontSize: 14.5, lineHeight: 1.6, color: '#555', margin: `${title ? 0 : 4}px 0 22px`, whiteSpace: 'pre-line' }}>{o.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {!o.alert && <button onClick={() => close(false)} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, borderRadius: 24, background: '#fff', color: '#555', fontFamily: ff, fontSize: 14, cursor: 'pointer' }}>{o.cancelText || 'Cancel'}</button>}
          <button autoFocus onClick={() => close(o.alert ? undefined : true)} style={{ padding: '10px 22px', border: 'none', borderRadius: 24, background: BLACK, color: '#fff', fontFamily: ff, fontSize: 14, cursor: 'pointer' }}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
