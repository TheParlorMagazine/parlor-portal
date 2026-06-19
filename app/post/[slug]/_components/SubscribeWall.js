'use client'

import { useState, useEffect, useRef } from 'react'

export default function SubscribeWall() {
  const [visible, setVisible]     = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [email, setEmail]         = useState('')
  const [status, setStatus] = useState('idle')
  const scrollCount = useRef(0)
  const lastY       = useRef(0)

  useEffect(() => {
    // Check if already subscribed/dismissed this session
    if (sessionStorage.getItem('parlor-sub-dismissed')) {
      setDismissed(true)
      return
    }

    function onScroll() {
      const y = window.scrollY
      if (y > lastY.current + 10) {        // scrolling down
        scrollCount.current += 1
        if (scrollCount.current >= 2) {    // second downward scroll gesture
          setVisible(true)
        }
      }
      lastY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function dismiss() {
    sessionStorage.setItem('parlor-sub-dismissed', '1')
    setDismissed(true)
    setVisible(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    // Redirect to signup with email pre-filled and source tag
    const params = new URLSearchParams({ email: email.trim(), source: 'article-wall' })
    sessionStorage.setItem('parlor-sub-dismissed', '1')
    window.location.href = `/signup?${params}`
  }

  if (dismissed || !visible) return null

  return (
    <>
      {/* Frosted backdrop — blurs article content below */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={dismiss}
      />

      {/* Wall card */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'linear-gradient(135deg, #f9eff2 0%, #fce8ec 60%, #f2d8df 100%)',
        borderTop: '1px solid rgba(194,100,120,0.15)',
        padding: '48px 24px 56px',
        fontFamily: "'Source Serif 4', Georgia, serif",
        boxShadow: '0 -8px 48px rgba(0,0,0,0.08)',
      }}>
        {/* Decorative corners */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 120, height: 120, backgroundImage: "url('/corner-flourish.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', opacity: 0.25 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, backgroundImage: "url('/corner-flourish.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', opacity: 0.25, transform: 'scaleX(-1)' }} />

        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative' }}>

          {/* Close */}
          <button
            onClick={dismiss}
            style={{ position: 'absolute', top: -16, right: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#c47080', lineHeight: 1, padding: 4 }}
            aria-label="Close"
          >×</button>

          <p style={{ fontSize: 13, color: '#c47080', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, margin: '0 0 10px' }}>Keep reading</p>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px', lineHeight: 1.15 }}>
            Subscribe to Keep Reading
          </h2>
          <p style={{ fontSize: 16, color: '#666', margin: '0 0 28px', lineHeight: 1.6 }}>
            Join The Parlor — independent media for women who think.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 0, maxWidth: 480, margin: '0 auto 16px' }}>
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                flex: 1, padding: '13px 18px',
                border: '1px solid rgba(194,100,120,0.3)',
                borderRight: 'none',
                borderRadius: '6px 0 0 6px',
                fontSize: 15,
                fontFamily: "'Source Serif 4', Georgia, serif",
                outline: 'none',
                background: '#fff',
                color: '#1a1a1a',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '13px 24px',
                background: '#1a1a1a',
                color: '#fff',
                border: 'none',
                borderRadius: '0 6px 6px 0',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Source Serif 4', Georgia, serif",
                whiteSpace: 'nowrap',
              }}
            >
              Subscribe
            </button>
          </form>

          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>
            Already a subscriber?{' '}
            <a href="/login" style={{ color: '#c47080', textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign in here</a>
          </p>
        </div>
      </div>
    </>
  )
}
