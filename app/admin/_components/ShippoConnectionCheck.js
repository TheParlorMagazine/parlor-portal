'use client'
import { useRef, useState } from 'react'
export default function ShippoConnectionCheck({ token }) {
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), lock = useRef(false)
  async function check() {
    if (lock.current) return
    lock.current = true; setBusy(true); setResult(null)
    try {
      const response = await fetch('/api/admin/shop-shipping-check', { headers: { Authorization: `Bearer ${await token()}` }, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The connection check could not run.')
      setResult(data)
    } catch (error) { setResult({ ok: false, message: error.message || 'The connection check could not run.' }) }
    finally { lock.current = false; setBusy(false) }
  }
  return <section aria-label="Shippo connection" style={{ margin: '12px 0 18px', padding: '12px 14px', background: '#faf8f9', border: '1px solid #e5e0e2', borderRadius: 8, fontSize: 13 }}>
    <button type="button" disabled={busy} onClick={check} style={{ padding: '8px 14px', border: '1px solid #e5e0e2', borderRadius: 18, background: '#fff', color: '#7a2531', font: 'inherit', cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Checking Shippo…' : 'Check Shippo connection'}</button>
    <span style={{ marginLeft: 10, color: '#777' }}>Checks credentials and carrier access. No labels or purchases.</span>
    {result && <div role="status" style={{ marginTop: 10, color: result.ok ? '#2d7a4f' : '#a3324c' }}>
      <div>{result.message}</div>
      {result.code && <div style={{ marginTop: 4 }}>Result: {result.code}{result.status ? ` · HTTP ${result.status}` : ''}{result.mode ? ` · Key mode: ${result.mode}` : ''}</div>}
      {!!result.missing?.length && <div style={{ marginTop: 4 }}>Missing settings: {result.missing.join(', ')}</div>}
    </div>}
  </section>
}
