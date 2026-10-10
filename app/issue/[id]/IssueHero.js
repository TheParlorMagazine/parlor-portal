'use client'

import { useEffect, useRef, useState } from 'react'

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"

export default function IssueHero({ issue, issued }) {
  const heroRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    // Trigger entrance animations after first paint
    const t = setTimeout(() => setReady(true), 60)
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(t)
    }
  }, [])

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const prog = Math.min(1, scrollY / (vh * 0.8))

  const titleOpacity = Math.min(1, prog * 2)
  const titleY = 30 - prog * 30
  const cloudsScrollY = -scrollY * 0.55
  const cloudsScale = 1 + prog * 0.08

  return (
    <div ref={heroRef} style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#2a1c14' }}>
      <style>{`
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) translateY(0); }
          50%       { opacity: 1; transform: translateX(-50%) translateY(5px); }
        }
      `}</style>

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
        <svg width="22" height="16" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="27" y1="12" x2="3" y2="12" /><polyline points="10 19 3 12 10 5" />
        </svg>
        Home
      </a>

      {/* Cover — outer: scroll parallax only; inner img: entrance fade+blur */}
      <div style={{
        position: 'absolute', top: '-15%', left: 0, right: 0, height: '130%',
        transform: `translateY(${-scrollY * 0.3}px)`,
        willChange: 'transform',
      }}>
        <img
          src="/issue-02-cover.png"
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block',
            opacity: ready ? 1 : 0,
            filter: ready ? 'blur(0px)' : 'blur(14px)',
            transition: 'opacity 0.9s ease, filter 0.9s ease',
          }}
        />
      </div>

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Gradient behind text — fades in with title */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', zIndex: 3,
        background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 60%, transparent 100%)',
        opacity: titleOpacity, pointerEvents: 'none',
      }} />

      {/* Title — fades in on scroll */}
      <div style={{
        position: 'absolute', bottom: '10%', left: 0, right: 0,
        textAlign: 'center', zIndex: 4, padding: '0 24px',
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        willChange: 'opacity, transform',
      }}>
        <h1 style={{
          fontFamily: DISPLAY, fontWeight: 700,
          fontSize: 'clamp(42px, 7vw, 88px)', lineHeight: 1.02,
          color: '#fff', margin: '0 0 16px', letterSpacing: '-0.01em',
          textShadow: '0 2px 24px rgba(0,0,0,0.3)',
        }}>
          {issue.title}
        </h1>
        {issue.number && (
          <div style={{
            fontFamily: BODY, fontSize: 15, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#f2b8c6',
          }}>
            Issue {String(issue.number).padStart(2, '0')}{issued ? ` · ${issued}` : ''}
          </div>
        )}
      </div>

      {/* Clouds — outer: scroll parallax only; inner: entrance slide-up */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 3, pointerEvents: 'none',
        transform: `translateY(${cloudsScrollY}px) scale(${cloudsScale})`,
        transformOrigin: 'bottom center',
        willChange: 'transform',
      }}>
        <img
          src="/issue-02-clouds.png"
          alt=""
          style={{
            width: '100%', height: 'auto', display: 'block',
            opacity: ready ? 1 : 0,
            transform: ready ? 'translateY(0)' : 'translateY(60px)',
            transition: 'opacity 1.1s 0.25s ease, transform 1.4s 0.25s cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>

      {/* Scroll cue */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 5, opacity: Math.max(0, 1 - prog * 4),
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          color: 'rgba(255,255,255,0.75)', fontFamily: BODY, fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          animation: 'scrollPulse 2s ease-in-out infinite',
        }}>
          Scroll
          <svg width="16" height="20" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="8" y1="0" x2="8" y2="18"/><polyline points="2 12 8 18 14 12"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
