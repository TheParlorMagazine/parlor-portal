'use client'

import { useEffect, useRef, useState } from 'react'

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"

export default function IssueHero({ issue, issued }) {
  const heroRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  // Progress 0→1 over first viewport height of scroll
  const prog = Math.min(1, scrollY / (vh * 0.8))

  // Title fades in as you scroll down
  const titleOpacity = Math.min(1, prog * 2)
  const titleY = 30 - prog * 30

  // Clouds float upward and forward (scale slightly) on scroll
  const cloudsY = -scrollY * 0.55
  const cloudsScale = 1 + prog * 0.08

  return (
    <div ref={heroRef} style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Back button */}
      <a
        href="/"
        style={{
          position: 'absolute', top: 28, left: 36, zIndex: 20,
          display: 'inline-flex', alignItems: 'center', gap: 9,
          color: 'rgba(255,255,255,0.85)', fontFamily: BODY, fontSize: 13,
          letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
      >
        <svg width="22" height="16" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.18s ease' }}>
          <line x1="27" y1="12" x2="3" y2="12" /><polyline points="10 19 3 12 10 5" />
        </svg>
        Home
      </a>

      {/* Full-bleed cover — parallax slower than scroll */}
      <img
        src="/issue-02-cover.png"
        alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '115%',
          objectFit: 'cover', objectPosition: 'center top',
          transform: `translateY(${scrollY * 0.3}px)`,
          willChange: 'transform',
        }}
      />

      {/* Dark gradient overlay so text is readable */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 100%)',
        zIndex: 2,
      }} />

      {/* Title — fades in on scroll */}
      <div style={{
        position: 'absolute', bottom: '12%', left: 0, right: 0,
        textAlign: 'center', zIndex: 4, padding: '0 24px',
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        transition: 'none',
        willChange: 'opacity, transform',
      }}>
        {issue.number && (
          <div style={{
            fontFamily: BODY, fontSize: 13, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#f2b8c6', marginBottom: 14,
          }}>
            Issue {String(issue.number).padStart(2, '0')}{issued ? ` · ${issued}` : ''}
          </div>
        )}
        <h1 style={{
          fontFamily: DISPLAY, fontWeight: 700,
          fontSize: 'clamp(42px, 7vw, 88px)', lineHeight: 1.02,
          color: '#fff', margin: 0, letterSpacing: '-0.01em',
          textShadow: '0 2px 24px rgba(0,0,0,0.4)',
        }}>
          {issue.title}
        </h1>
      </div>

      {/* Clouds — float up faster than the cover on scroll */}
      <img
        src="/issue-02-clouds.png"
        alt=""
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          width: '100%', height: 'auto',
          transform: `translateY(${cloudsY}px) scale(${cloudsScale})`,
          transformOrigin: 'bottom center',
          zIndex: 3,
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      />

      {/* Scroll cue */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 5, opacity: Math.max(0, 1 - prog * 3),
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        color: 'rgba(255,255,255,0.6)', fontFamily: BODY, fontSize: 11,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        Scroll
        <svg width="16" height="20" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="8" y1="0" x2="8" y2="18"/><polyline points="2 12 8 18 14 12"/>
        </svg>
      </div>
    </div>
  )
}
