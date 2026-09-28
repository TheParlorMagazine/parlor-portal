'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell from '../_components/PortalShell'
import { fieldCss } from '../_components/formCss'

const DEST = { library: '/library', 'library-detail': '/library', dashboard: '/portal', forum: '/portal', events: '/portal', inbox: '/portal' }
const TYPE_LABEL = { reply: 'Reply', inbox: 'Message', library: 'Library', event: 'Event', new_thread: 'Discussion', system: 'Parlor' }

function timeAgo(s) {
  const d = new Date(s); const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return 'just now'
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const css = `
  .nt-actions { display:flex; justify-content:flex-end; margin-bottom:14px; }
  .nt-list { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:#fff; }
  .nt-item { display:flex; gap:14px; align-items:flex-start; padding:16px 18px; border-bottom:1px solid var(--border); cursor:pointer; text-align:left; width:100%; background:none; border-left:none; border-right:none; border-top:none; font-family:'thermal-variable', Georgia, serif; }
  .nt-item:last-child { border-bottom:none; }
  .nt-item:hover { background:#fdf6f8; }
  .nt-item.unread { background:#fdf1f4; }
  .nt-item.unread:hover { background:#fce8ee; }
  .nt-dot { width:8px; height:8px; border-radius:50%; margin-top:7px; flex-shrink:0; background:transparent; }
  .nt-item.unread .nt-dot { background:var(--pink); }
  .nt-body { flex:1; min-width:0; }
  .nt-type { font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#9a7580; margin-bottom:3px; }
  .nt-msg { font-size:14px; line-height:1.5; color:var(--ink); }
  .nt-time { font-size:12px; color:var(--muted); flex-shrink:0; margin-top:2px; }
  .nt-empty { text-align:center; padding:70px 24px; color:var(--muted); font-style:italic; }
`

function Notifications() {
  const supabase = createClient()
  const [state, setState] = useState('loading')
  const [items, setItems] = useState([])

  async function token() { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/portal/notifications', { headers: { Authorization: `Bearer ${await token()}` } })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) { setItems(data.notifications || []); setState('ready') }
      } catch { if (!cancelled) setState('error') }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function open(n) {
    if (!n.read) {
      setItems(list => list.map(x => x.id === n.id ? { ...x, read: true } : x))
      fetch('/api/portal/notifications', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
    }
    const dest = DEST[n.link_to] || '/portal'
    window.location.href = dest
  }

  async function markAll() {
    setItems(list => list.map(x => ({ ...x, read: true })))
    fetch('/api/portal/notifications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ all: true }),
    }).catch(() => {})
  }

  const hasUnread = items.some(n => !n.read)

  return (
    <>
      <style>{fieldCss + css}</style>
      <h1 className="pg-title">Notifications</h1>
      <p className="pg-sub">Replies, messages, new drops, and events.</p>

      {state === 'ready' && items.length > 0 && (
        <div className="nt-actions">
          <button className="btn-text" onClick={markAll} disabled={!hasUnread}>Mark all as read</button>
        </div>
      )}

      {state === 'loading' && <div className="nt-empty">Loading…</div>}
      {state === 'error' && <div className="nt-empty">Couldn’t load notifications.</div>}
      {state === 'ready' && (
        items.length === 0
          ? <div className="nt-empty">You’re all caught up.</div>
          : <div className="nt-list">
              {items.map(n => (
                <button key={n.id} className={`nt-item${n.read ? '' : ' unread'}`} onClick={() => open(n)}>
                  <span className="nt-dot" />
                  <span className="nt-body">
                    <span className="nt-type">{TYPE_LABEL[n.type] || 'Parlor'}</span>
                    <span className="nt-msg">{n.message}</span>
                  </span>
                  <span className="nt-time">{timeAgo(n.created_at)}</span>
                </button>
              ))}
            </div>
      )}
    </>
  )
}

export default function NotificationsPage() {
  return <PortalShell active="notifications"><Notifications /></PortalShell>
}
