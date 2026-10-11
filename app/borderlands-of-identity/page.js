'use client'

import { useEffect, useRef, useState } from 'react'
import SiteFooter from '../_components/SiteFooter'
import IssueStyles from './_components/IssueStyles'
import { ISSUE, SECTIONS } from './_data'

export default function BorderlandsHubPage() {
  const heroBgRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const bg = heroBgRef.current
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = null
    function onScroll() {
      setScrollY(window.scrollY || 0)
      if (bg && !reduced) {
        if (raf) return
        raf = requestAnimationFrame(() => {
          raf = null
          bg.style.transform = `translate3d(0, ${(window.scrollY || 0) * 0.55}px, 0)`
        })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const prog = Math.min(1, scrollY / (vh * 0.5))
  const titleOpacity = Math.min(1, prog * 2)
  const titleY = Math.max(0, 30 - prog * 30)

  return (
    <div className="boi-root">
      <IssueStyles />

      <section className="boi-hero" style={{ '--herobg': `url('${ISSUE.heroBg}')` }}>
        <div className="boi-hero-bg" aria-hidden="true" ref={heroBgRef}></div>
        <div className="boi-hero-wash" aria-hidden="true"></div>
        {/* Back-home button — matches IssueHero style */}
        <a
          href="/"
          style={{
            position: 'absolute', top: 28, left: 36, zIndex: 20,
            display: 'inline-flex', alignItems: 'center', gap: 9,
            color: 'rgba(255,255,255,0.85)', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 13,
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
        <div className="boi-hero-text-gradient" aria-hidden="true" style={{ opacity: prog }} />
        <div className="boi-hero-inner" style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          willChange: 'opacity, transform',
        }}>
          <div className="boi-title-wrap">
            <h1 className="boi-hero-title">{ISSUE.title}</h1>
            <span className="boi-title-fx shine" aria-hidden="true">{ISSUE.title}</span>
            <span className="boi-title-fx glitter-a" aria-hidden="true">{ISSUE.title}</span>
            <span className="boi-title-fx glitter-b" aria-hidden="true">{ISSUE.title}</span>
          </div>
          <p className="boi-hero-intro">{ISSUE.intro}</p>
        </div>
      </section>

      <div className="boi-hub">
        <div className="boi-hub-head">
          <div className="boi-hub-eyebrow">Our inaugural digital issue</div>
          <h2 className="boi-hub-heading">Browse the issue by chapter</h2>
        </div>

        <div className="boi-grid">
          {SECTIONS.map(s => (
            <a key={s.slug} href={`/${ISSUE.slug}/${s.slug}`} className="boi-tile">
              <div className="boi-tile-figure">
                <img src={s.image} alt={s.title} loading="lazy" decoding="async" />
                <span className="boi-tile-count">
                  {s.articles.length} {s.articles.length === 1 ? 'piece' : 'pieces'}
                </span>
              </div>
              <div className="boi-tile-body">
                <h3 className="boi-tile-title">{s.title}</h3>
                <p className="boi-tile-sub">{s.subtitle}</p>
                <span className="boi-tile-more">Enter <span aria-hidden="true">→</span></span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
