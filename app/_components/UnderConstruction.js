'use client'

import { useEffect, useRef, useState } from 'react'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

function makeParticles() {
  return Array.from({ length: 55 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 130 - 15,
    size: 3 + Math.random() * 6,
    opacity: 0.25 + Math.random() * 0.35,
    duration: 10 + Math.random() * 16,
    delay: -Math.random() * 24,
    driftX: (Math.random() - 0.5) * 80,
    depth: 0.2 + Math.random() * 0.8,
  }))
}

export default function UnderConstruction({ contactEmail }) {
  const layerRef = useRef(null)
  const revealRef = useRef(null)
  const [particles, setParticles] = useState([])
  const [revealed, setRevealed] = useState(false)

  useEffect(() => { setParticles(makeParticles()) }, [])

  useEffect(() => {
    const el = revealRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); obs.disconnect() }
    }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const sy = window.scrollY
        layer.querySelectorAll('[data-depth]').forEach(el => {
          const depth = parseFloat(el.dataset.depth)
          el.style.transform = `translateY(${sy * depth * -0.3}px)`
        })
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <SiteHeader />
      <style>{`
        @keyframes uc-float {
          0%   { margin-top: 0;   margin-left: 0;   opacity: var(--uo); }
          35%  { margin-top: -32px; margin-left: calc(var(--udx) * 0.5); }
          70%  { margin-top: -18px; margin-left: var(--udx); }
          100% { margin-top: -60px; margin-left: calc(var(--udx) * 0.7); opacity: 0; }
        }
        .uc-wrap { position: relative; overflow: hidden; background: #fdf5f6; }
        .uc-particles { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .uc-particle {
          position: absolute;
          border-radius: 50%;
          background: #9b7e84;
          animation: uc-float var(--ud) var(--udel) ease-in-out infinite;
        }
        .uc-main {
          min-height: 65vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .uc-img { width: 220px; height: auto; margin-bottom: 28px; opacity: 0.9; }
        .uc-title {
          font-family: 'Alex Brush', cursive;
          font-size: clamp(40px, 7vw, 72px);
          color: #1a1a1a;
          margin: 0 0 10px;
          font-weight: 400;
          line-height: 1.1;
        }
        .uc-divider { width: 52px; height: 2px; background: #d4a0a8; margin: 20px auto; border-radius: 2px; }
        .uc-sub {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 16px;
          color: #6b5c5e;
          max-width: 420px;
          line-height: 1.7;
          margin: 0 auto;
          font-style: italic;
        }
        .uc-contact { font-family: 'Source Serif 4', Georgia, serif; font-size: 14.5px; color: #6b5c5e; margin-top: 22px; }
        .uc-contact a { color: #c4717f; text-decoration: underline; text-underline-offset: 3px; }
        .uc-contact a:hover { color: #a3535f; }
        .uc-reveal {
          transition: opacity 0.8s ease, transform 0.8s ease;
          opacity: 0;
          transform: translateY(18px);
        }
        .uc-reveal.in { opacity: 1; transform: translateY(0); }
        @media (min-width: 900px) {
          .uc-img { width: 300px; }
        }
      `}</style>
      <div className="uc-wrap">
        <div className="uc-particles" ref={layerRef} aria-hidden="true">
          {particles.map(p => (
            <span
              key={p.id}
              className="uc-particle"
              data-depth={p.depth}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                '--uo': p.opacity,
                '--ud': `${p.duration}s`,
                '--udel': `${p.delay}s`,
                '--udx': `${p.driftX}px`,
                filter: p.size > 6 ? 'blur(1px)' : 'none',
              }}
            />
          ))}
        </div>
        <main className="uc-main">
          <img className="uc-img" src="/women-working.png" alt="" />
          <h1 className="uc-title">Women working — mind the dust</h1>
          <div className="uc-divider" />
          <div ref={revealRef} className={`uc-reveal${revealed ? ' in' : ''}`}>
            <p className="uc-sub">This page is being lovingly built. Check back soon.</p>
            {contactEmail && (
              <p className="uc-contact">
                In the meantime, reach us at{' '}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </p>
            )}
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  )
}
