'use client'

import RepublishedByline from '../../../_components/RepublishedByline'
import { useEffect, useRef, useState } from 'react'

export default function ParallaxHero({
  src, alt, title, subtitle,
  authorName, authorPhotoUrl, authorProfileUrl, publishedDate, republishedArticle,
  objectPosition = 'center center',
  desktopObjectPosition,
}) {
  const wrapRef  = useRef(null)
  const imgRef   = useRef(null)
  const titleRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let raf = null

    const update = () => {
      raf = null
      const wrap  = wrapRef.current
      const img   = imgRef.current
      const tEl   = titleRef.current
      if (!wrap || !img || !tEl) return

      const rect = wrap.getBoundingClientRect()
      const vh   = window.innerHeight || 1

      const extra    = Math.max(0, img.offsetHeight - wrap.offsetHeight)
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)))
      img.style.transform = `translateY(${(-progress * extra).toFixed(1)}px)`

      const heroH = wrap.offsetHeight || 1
      const reveal = Math.max(0, Math.min(1, window.scrollY / (heroH * 0.3)))
      tEl.style.opacity    = reveal
      tEl.style.transform  = `translateY(${((1 - reveal) * 32).toFixed(1)}px)`
    }

    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }

    const onLoad = () => { setReady(true); onScroll() }
    const imgEl = imgRef.current
    if (imgEl) {
      if (imgEl.complete) onLoad()
      else imgEl.addEventListener('load', onLoad)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      if (raf != null) cancelAnimationFrame(raf)
      if (imgEl) imgEl.removeEventListener('load', onLoad)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        height: 'clamp(560px, 92vh, 960px)',
        overflow: 'hidden',
        background: '#111',
      }}
    >
      <style>{`
        .parallax-article-hero-image { object-position: var(--hero-position); }
        @media (min-width: 1024px) {
          .parallax-article-hero-image { object-position: var(--hero-desktop-position); }
        }
      `}</style>
      {/* Parallax image */}
      <img
        ref={imgRef}
        className="parallax-article-hero-image"
        src={src}
        alt={alt || title || ''}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: 'auto',
          minHeight: '115%',
          objectFit: 'cover',
          '--hero-position': objectPosition,
          '--hero-desktop-position': desktopObjectPosition || objectPosition,
          display: 'block',
          willChange: 'transform',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.72) 80%, rgba(0,0,0,0.92) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Scroll-reveal title + deck + byline pinned to the bottom */}
      <div
        ref={titleRef}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: 'clamp(24px, 4vw, 56px) clamp(24px, 6vw, 80px)',
          pointerEvents: 'none',
          opacity: 0,
          transform: 'translateY(32px)',
        }}
      >
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: '#fff',
          fontSize: 'clamp(28px, 5vw, 72px)',
          lineHeight: '1.08',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          margin: '0 0 16px',
          maxWidth: '860px',
          textShadow: '0 2px 24px rgba(0,0,0,0.4)',
        }}>
          {title}
        </h1>

        {subtitle && (
          <p style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            color: 'rgba(255,255,255,0.82)',
            fontSize: 'clamp(15px, 1.6vw, 22px)',
            lineHeight: '1.45',
            fontWeight: '300',
            margin: '0 0 20px',
            maxWidth: '680px',
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          }}>
            {subtitle}
          </p>
        )}

        {republishedArticle && <RepublishedByline article={republishedArticle} publishedDate={publishedDate} dark />}
        {!republishedArticle && (authorName || publishedDate) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
            {authorPhotoUrl ? (
              <img src={authorPhotoUrl} alt={authorName || ''} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }} />
            ) : authorName ? (
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f2b8c6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: '#c4364a' }}>
                {authorName[0]}
              </div>
            ) : null}
            <div>
              {authorName && (
                <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                  {authorProfileUrl
                    ? <a href={authorProfileUrl} style={{ color: '#fff', textDecoration: 'none' }}>{authorName}</a>
                    : authorName}
                </div>
              )}
              {publishedDate && (
                <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  {publishedDate}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
