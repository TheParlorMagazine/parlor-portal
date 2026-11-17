'use client'

import { useEffect, useRef, useState } from 'react'
import SiteFooter from '../../_components/SiteFooter'
import './about.css'

const links = [
  ['Mission', '/about/mission'],
  ['Editorial Standards', '/about/editorial-standards'],
  ['The People of The Parlor', '/about/people'],
  ['Support Us', '/buy-us-a-birthday-gift'],
]

export default function AboutShell({ activePage, children }) {
  const rootRef = useRef(null), menuRef = useRef(null), barRef = useRef(null)
  const [arrows, setArrows] = useState({ left: false, right: false })

  useEffect(() => {
    const root = rootRef.current, menu = menuRef.current, bar = barRef.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, disposed = false
    function menuEdges() {
      setArrows({ left: menu.scrollLeft > 1, right: menu.scrollLeft + menu.clientWidth < menu.scrollWidth - 1 })
    }
    function measure() {
      root.style.setProperty('--about-menu-height', `${bar.offsetHeight}px`)
      const active = menu.querySelector('[aria-current="page"]')
      if (active && menu.scrollWidth > menu.clientWidth) {
        const box = active.getBoundingClientRect(), viewport = menu.getBoundingClientRect()
        menu.scrollLeft += box.left - viewport.left - (menu.clientWidth - box.width) / 2
      }
      menuEdges()
    }
    function update() {
      frame = 0
      const hero = root.querySelector('.about-hero')
      const offset = innerWidth >= 1000 && !motion.matches ? Math.max(-55, Math.min(55, -hero.getBoundingClientRect().top * .14)) : 0
      root.style.setProperty('--about-art-offset', `${offset}px`)
      for (const nav of root.querySelectorAll('[data-section-index]')) {
        const anchors = [...nav.querySelectorAll('a[href^="#"]')]
        const targets = anchors.map(a => document.getElementById(a.hash.slice(1)))
        let current = targets[0]
        for (const target of targets) if (target && target.getBoundingClientRect().top <= bar.offsetHeight + 100) current = target
        for (const a of anchors) {
          if (a.hash.slice(1) === current?.id) a.setAttribute('aria-current', 'location')
          else a.removeAttribute('aria-current')
        }
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update) }
    function revealHash() {
      let id
      try { id = decodeURIComponent(location.hash.slice(1)) } catch { return }
      const target = document.getElementById(id)
      if (!target || !root.contains(target)) return
      const details = target.closest('details')
      if (details) details.open = true
      requestAnimationFrame(() => { if (!disposed) target.scrollIntoView({ block: 'start' }) })
    }
    const resize = new ResizeObserver(measure)
    resize.observe(bar); resize.observe(menu)
    menu.addEventListener('scroll', menuEdges, { passive: true })
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('hashchange', revealHash)
    motion.addEventListener('change', schedule)
    root.addEventListener('toggle', schedule, true)
    let reveal
    if ('IntersectionObserver' in window && !motion.matches) {
      root.classList.add('about-motion-ready')
      reveal = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          entry.target.classList.add('is-visible'); reveal.unobserve(entry.target)
        }
      }, { threshold: .08 })
      root.querySelectorAll('[data-reveal]').forEach(el => reveal.observe(el))
    }
    measure(); update(); revealHash()
    document.fonts?.ready.then(() => { if (!disposed) measure() })
    return () => {
      disposed = true
      cancelAnimationFrame(frame); resize.disconnect(); reveal?.disconnect()
      root.classList.remove('about-motion-ready')
      menu.removeEventListener('scroll', menuEdges)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('hashchange', revealHash)
      motion.removeEventListener('change', schedule)
      root.removeEventListener('toggle', schedule, true)
    }
  }, [activePage])

  function scrollMenu(direction) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    menuRef.current?.scrollBy({ left: direction * 200, behavior: reduced ? 'auto' : 'smooth' })
  }

  return <>
    <main className="about-site" ref={rootRef}>
      <div className="about-hero">
        <div className="about-art" aria-hidden="true" />
        <div className="about-hero-inner">
          <a className="about-home" href="/">← Home</a>
          <h1>Independent journalism.<br />Collective possibility.</h1>
          <p>The Parlor is an independent feminist publication examining power, culture, and the ways people are building more equitable and regenerative futures.</p>
        </div>
      </div>
      <div className="about-menu-wrap" ref={barRef}>
        {arrows.left && <button type="button" className="about-arrow about-arrow-left" aria-label="Scroll About menu left" onClick={() => scrollMenu(-1)}>‹</button>}
        <nav className="about-menu" aria-label="About The Parlor" ref={menuRef}>
          {links.map(([label, href]) => <a key={href} href={href} aria-current={activePage === href ? 'page' : undefined}>{label}</a>)}
        </nav>
        {arrows.right && <button type="button" className="about-arrow about-arrow-right" aria-label="Scroll About menu right" onClick={() => scrollMenu(1)}>›</button>}
      </div>
      {children}
    </main>
    <SiteFooter />
  </>
}
