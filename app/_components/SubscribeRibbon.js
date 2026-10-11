'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'

const FALLBACK = {
  kicker: 'Support independent journalism',
  headline: 'Join The Parlor',
  message: 'Sustain the work and receive full access, early releases, and subscriber-only extras.',
  cta_label: 'Become a paid subscriber',
  cta_href: '/plans',
}

export default function SubscribeRibbon() {
  const [collapsed, setCollapsed] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const nowISO = new Date().toISOString()
    supabase
      .from('announcements')
      .select('id, kicker, headline, message, cta_label, cta_href, type, starts_at, ends_at, sort, placement')
      .eq('active', true)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const live = a => (!a.starts_at || a.starts_at <= nowISO) && (!a.ends_at || a.ends_at >= nowISO)
        const ribbon = data.filter(a => (a.placement || 'ribbon') !== 'homepage' && live(a))
        if (ribbon.length) setAnnouncements(ribbon)
      })
  }, [])

  useEffect(() => {
    if (announcements.length < 2) return
    const t = setInterval(() => setIndex(i => (i + 1) % announcements.length), 6500)
    return () => clearInterval(t)
  }, [announcements.length])

  useEffect(() => {
    let timer
    const onScroll = () => {
      setScrolling(true)
      clearTimeout(timer)
      timer = setTimeout(() => setScrolling(false), 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [])

  const data = announcements.length ? (announcements[index] || announcements[0]) : FALLBACK

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');
        .sub-ribbon { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: #f8d9dc; box-shadow: 0 -18px 40px rgba(0,0,0,0.22), 0 -6px 14px rgba(0,0,0,0.12); font-family: 'Source Serif 4', Georgia, serif; color: #0a0a0a; transition: opacity 220ms ease; }
        .sub-ribbon.scrolling { opacity: 0.5; }
        .sub-ribbon-inner { max-width: 1280px; margin: 0 auto; padding: 14px 64px 14px 28px; display: grid; grid-template-columns: max-content 1fr max-content; align-items: center; gap: 14px; position: relative; }
        .sub-ribbon-kicker { font-size: 14px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; line-height: 1.1; }
        .sub-ribbon-subhead { font-family: 'Alex Brush', cursive; font-size: 24px; font-weight: 400; line-height: 1.2; margin-top: 2px; }
        .sub-ribbon-message { font-size: 16px; line-height: 1.35; font-weight: 500; opacity: 0.9; text-align: center; max-width: 52ch; margin: 0 auto; }
        .sub-ribbon-cta { display: inline-flex; align-items: center; justify-content: center; padding: 12px 28px; background: #0a0a0a; color: #ffffff; font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 700; text-decoration: none; min-width: 240px; transition: background 0.15s; white-space: nowrap; }
        .sub-ribbon-cta:hover { background: #222; }
        .sub-ribbon-toggle { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.1); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; color: #0a0a0a; }
        @media (min-width: 760px) { .sub-ribbon-toggle { display: none; } }
        .sub-ribbon-toggle:hover { background: rgba(0,0,0,0.18); }
        .sub-ribbon-toggle svg { transition: transform 0.25s ease; }
        .sub-ribbon-toggle.flipped svg { transform: rotate(180deg); }
        @media (max-width: 759px) {
          .sub-ribbon-inner { grid-template-columns: 1fr auto; gap: 10px; padding: 12px 56px 12px 18px; }
          .sub-ribbon-message { display: none; }
        }
      `}</style>
      <div className={`sub-ribbon${scrolling ? ' scrolling' : ''}`}>
        <div className="sub-ribbon-inner">
          <div>
            {data.kicker && <div className="sub-ribbon-kicker">{data.kicker}</div>}
            {data.headline && <div className="sub-ribbon-subhead">{data.headline}</div>}
          </div>
          {data.message && <div className="sub-ribbon-message">{data.message}</div>}
          {data.cta_label && <a href={data.cta_href || '#'} className="sub-ribbon-cta">{data.cta_label}</a>}
          <button
            className={`sub-ribbon-toggle${collapsed ? ' flipped' : ''}`}
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            <svg viewBox="0 0 24 14" width="18" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2L12 12L22 2"/>
            </svg>
          </button>
        </div>
      </div>
      <div style={{ height: '72px' }} />
    </>
  )
}
