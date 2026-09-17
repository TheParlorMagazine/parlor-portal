'use client'

import { useEffect, useRef } from 'react'
import SiteHeader from '../_components/SiteHeader'
import SiteFooter from '../_components/SiteFooter'
import IssueStyles from './_components/IssueStyles'
import { ISSUE, SECTIONS } from './_data'

export default function BorderlandsHubPage() {
  const heroBgRef = useRef(null)

  useEffect(() => {
    const bg = heroBgRef.current
    if (!bg) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = null
    function onScroll() {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        bg.style.transform = `translate3d(0, ${(window.scrollY || 0) * 0.55}px, 0)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="boi-root">
      <IssueStyles />
      <SiteHeader />

      <section className="boi-hero" style={{ '--herobg': `url('${ISSUE.heroBg}')` }}>
        <div className="boi-hero-bg" aria-hidden="true" ref={heroBgRef}></div>
        <div className="boi-hero-wash" aria-hidden="true"></div>
        <div className="boi-hero-inner">
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
