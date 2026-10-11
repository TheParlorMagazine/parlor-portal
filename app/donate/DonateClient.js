'use client'

import { useEffect, useRef } from 'react'

export default function DonateClient({ gifts }) {
  const imgRef = useRef(null)
  const itemRefs = useRef([])

  useEffect(() => {
    // Fade in hero image on load
    const img = imgRef.current
    if (img) {
      img.style.opacity = '0'
      img.style.transition = 'opacity 0.9s ease'
      const onLoad = () => { img.style.opacity = '1' }
      if (img.complete) { img.style.opacity = '1' }
      else { img.addEventListener('load', onLoad) }
      return () => img.removeEventListener('load', onLoad)
    }
  }, [])

  useEffect(() => {
    const items = itemRefs.current.filter(Boolean)
    if (!items.length) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gift-item--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    items.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [gifts])

  return (
    <>
      <style>{`
        .donate-wrap { font-family: 'Source Serif 4', Georgia, serif; }

        /* ── HERO ── */
        .donate-hero { width: 100%; min-height: 80vh; display: grid; grid-template-columns: 1fr 1fr; background: #fdf8f5; }
        .donate-hero-text { display: flex; flex-direction: column; justify-content: center; padding: clamp(48px,8vw,100px) clamp(32px,6vw,80px); }
        .donate-home { display: inline-flex; align-items: center; gap: 7px; font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #888; text-decoration: none; margin-bottom: clamp(32px,4vw,56px); }
        .donate-home:hover { color: #1a1a1a; }
        .donate-eyebrow { font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #c47080; margin-bottom: 18px; }
        .donate-head { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(36px, 4.5vw, 64px); font-weight: 700; color: #1a1a1a; line-height: 1.06; margin: 0 0 24px; }
        .donate-sub { font-size: clamp(15px, 1.3vw, 18px); color: #555; line-height: 1.8; margin: 0; max-width: 480px; }
        .donate-hero-img { position: relative; overflow: hidden; min-height: 480px; background: #fdf4f7; }
        .donate-hero-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .donate-hero-img-placeholder { width: 100%; height: 100%; background: #f2dde3; }

        @media (max-width: 720px) {
          .donate-hero { grid-template-columns: 1fr; min-height: unset; }
          .donate-hero-img { min-height: 300px; order: -1; }
          .donate-hero-text { padding: 36px 24px 48px; }
        }

        /* ── GIFT LIST ── */
        .donate-list-wrap { max-width: 900px; margin: 0 auto; padding: clamp(48px,6vw,80px) 24px clamp(64px,8vw,120px); }
        .donate-list { display: flex; flex-direction: column; gap: 2px; }

        .gift-item {
          display: flex; align-items: center; gap: 24px; padding: 28px 0;
          border-top: 1px solid #e8e0e3;
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .gift-item:last-child { border-bottom: 1px solid #e8e0e3; }
        .gift-item--visible { opacity: 1; transform: translateY(0); }
        .gift-item--soldout { opacity: 0.45; pointer-events: none; }
        .gift-item--soldout.gift-item--visible { opacity: 0.45; }

        .gift-amount { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(18px, 2vw, 22px); font-weight: 700; color: #1a1a1a; min-width: 90px; flex-shrink: 0; }
        .gift-body { flex: 1; }
        .gift-label { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(16px, 1.8vw, 20px); font-weight: 600; color: #1a1a1a; margin: 0 0 6px; }
        .gift-desc { font-size: 14px; color: #777; line-height: 1.6; margin: 0; }
        .gift-remaining { font-size: 12px; color: #c47080; letter-spacing: 0.06em; margin-top: 6px; }
        .gift-soldout-badge { font-size: 12px; color: #aaa; letter-spacing: 0.06em; margin-top: 6px; }
        .gift-btn { display: inline-block; padding: 12px 22px; background: #1a1a1a; color: #fff; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; font-weight: 600; text-decoration: none; flex-shrink: 0; transition: background 0.15s, color 0.15s, outline 0.15s; }
        .gift-btn:hover { background: #fff; color: #1a1a1a; outline: 2px solid #1a1a1a; }
        .gift-btn--soldout { background: #ccc; cursor: not-allowed; }

        @media (max-width: 560px) {
          .gift-item { flex-wrap: wrap; }
          .gift-amount { min-width: unset; }
          .gift-btn { width: 100%; text-align: center; }
        }
      `}</style>

      <main className="donate-wrap">
        {/* HERO */}
        <section className="donate-hero">
          <div className="donate-hero-text">
            <a href="/" className="donate-home">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Home
            </a>
            <div className="donate-eyebrow">Birthday Gifts</div>
            <h1 className="donate-head">Give The Parlor<br />a birthday gift.</h1>
            <p className="donate-sub">
              The Parlor turns one this year. If our work has meant something to you, here are a few ways to help us keep going — from a cup of coffee to funding the next print run.
            </p>
          </div>
          <div className="donate-hero-img">
            <img ref={imgRef} src="/hil (13).png" alt="" />
          </div>
        </section>

        {/* GIFT LIST */}
        <div className="donate-list-wrap">
          <div className="donate-list">
            {gifts.map((gift, i) => {
              const soldOut = gift.remaining !== null && gift.remaining <= 0
              return (
                <div
                  key={gift.slug}
                  ref={el => { itemRefs.current[i] = el }}
                  className={`gift-item${soldOut ? ' gift-item--soldout' : ''}`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="gift-amount">{gift.amount_label}</div>
                  <div className="gift-body">
                    <div className="gift-label">{gift.label}</div>
                    {gift.description && <p className="gift-desc">{gift.description}</p>}
                    {gift.remaining !== null && !soldOut && (
                      <div className="gift-remaining">{gift.remaining} of {gift.capacity} remaining</div>
                    )}
                    {soldOut && <div className="gift-soldout-badge">Fully funded — thank you</div>}
                  </div>
                  <a
                    href={soldOut ? undefined : gift.monkeypod_url}
                    className={`gift-btn${soldOut ? ' gift-btn--soldout' : ''}`}
                    target={soldOut ? undefined : '_blank'}
                    rel="noreferrer"
                  >
                    {soldOut ? 'Funded' : 'Give this gift'}
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
