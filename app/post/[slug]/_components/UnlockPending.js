'use client'

import { useEffect } from 'react'

// Shown right after a successful Stripe payment redirect if access doesn't
// look unlocked yet — the webhook that grants access can lag slightly behind
// the browser redirect. Reloads once (marking ?retried=1) to give it a
// moment to land, then falls back to the normal gated/ungated render.
export default function UnlockPending() {
  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('retried', '1')
      window.location.replace(url.toString())
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      fontFamily: "'Source Serif 4', Georgia, serif",
      color: '#777', fontSize: '14px',
    }}>
      Confirming your purchase…
    </div>
  )
}
