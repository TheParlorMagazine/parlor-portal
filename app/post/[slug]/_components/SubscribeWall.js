'use client'

import { useState, useEffect, useRef } from 'react'

export default function SubscribeWall() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail]     = useState('')
  const scrollCount = useRef(0)
  const lastY       = useRef(0)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      if (y > lastY.current + 10) {
        scrollCount.current += 1
        if (scrollCount.current >= 2) {
          setVisible(true)
        }
      }
      lastY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when wall is visible
  useEffect(() => {
    if (!visible) return
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [visible])

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    const params = new URLSearchParams({
      email: email.trim(),
      source: 'article-wall',
      returnTo: window.location.pathname,
    })
    window.location.href = `/signup?${params}`
  }

  if (!visible) return null

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
            <a href={`/login?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`} style={{ color: '#c47080', textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign in here</a>
          </p>
        </div>
      </div>
    </>
  )
}
