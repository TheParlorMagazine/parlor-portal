'use client'

import { useEffect, useState } from 'react'

export default function ResendConfirmation({ email = '', returnTo = '/' }) {
  const [address, setAddress] = useState(email)
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setAddress(email) }, [email])
  useEffect(() => {
    if (!remaining) return
    const timer = setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  async function resend() {
    if (busy || remaining) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address, returnTo }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 429) setRemaining(Math.min(900, Math.max(60, Number(response.headers.get('Retry-After')) || 60)))
        throw new Error(data.error || 'Please try again shortly.')
      }
      setRemaining(60)
      setMessage('If this address has an account awaiting confirmation, a new confirmation email has been requested. Check your inbox and spam folder.')
    } catch (error) { setError(error.message || 'Please check your connection and try again.') }
    finally { setBusy(false) }
  }

  return <div style={{ marginTop: 16, fontSize: 13 }}>
    <details>
      <summary>Didn’t get the confirmation email? Resend</summary>
      <label style={{ display: 'block', marginTop: 12 }}>Email address
        <input type="email" autoComplete="email" value={address} onChange={event => setAddress(event.target.value)} style={{ width: '100%', padding: 10, boxSizing: 'border-box', marginTop: 6 }} />
      </label>
      <button type="button" onClick={resend} disabled={busy || remaining > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())} style={{ marginTop: 10, padding: 10 }}>
        {busy ? 'Sending...' : remaining ? `Try again in ${remaining}s` : 'Resend confirmation email'}
      </button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </details>
  </div>
}
