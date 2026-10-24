'use client'

import { useState } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell from '../_components/PortalShell'

export default function RecoverPurchasePage() {
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  async function recover(event) {
    event.preventDefault()
    setBusy(true); setMessage(''); setUrl('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { window.location.href = '/login?returnTo=%2Fportal%2Frecover-purchase'; return }
      const response = await fetch('/api/portal/recover-purchase', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ reference }),
      })
      const result = await response.json()
      setMessage(response.ok ? result.message : result.error)
      if (response.ok) setUrl(result.url)
    } catch { setMessage('Couldn’t check your purchase. Please try again. No additional payment was taken.') }
    finally { setBusy(false) }
  }
  return <PortalShell><div style={{ maxWidth: 600 }}>
    <h1>Recover a purchase</h1>
    <p style={{ lineHeight: 1.65 }}>Already paid for an article, audio or video? Sign in with the email you used at checkout. We’ll restore your access without charging again.</p>
    <p style={{ lineHeight: 1.65 }}>Enter the Stripe payment ID or Checkout session ID provided by support. If you don’t have it, <a href="mailto:hello@theparlormagazine.com">contact us</a> with the checkout email, article title and purchase date. Don’t send card details.</p>
    <form onSubmit={recover}>
      <label htmlFor="purchase-reference">Payment reference</label>
      <input id="purchase-reference" value={reference} onChange={event => setReference(event.target.value)} required placeholder="pi_… or cs_…" style={{ display: 'block', width: '100%', boxSizing: 'border-box', margin: '10px 0 18px', padding: 12, border: '1px solid #e8d4d8', borderRadius: 8, font: 'inherit' }} />
      <button type="submit" disabled={busy} style={{ background: '#111', color: '#fff', border: 0, borderRadius: 8, padding: '12px 20px', font: 'inherit', cursor: 'pointer' }}>{busy ? 'Checking…' : 'Recover purchase'}</button>
    </form>
    {message && <p role="status" style={{ lineHeight: 1.65 }}>{message}</p>}
    {url && <a href={url}>Read your article →</a>}
  </div></PortalShell>
}
