'use client'

import { useEffect, useRef, useState } from 'react'

export default function ParallaxHero({ src, alt, title }) {
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

      // Parallax: image drifts upward as you scroll down
      const extra    = Math.max(0, img.offsetHeight - wrap.offsetHeight)
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)))
      img.style.transform = `translateY(${(-progress * extra).toFixed(1)}px)`

      // Title reveal: hidden at scrollY=0, fully visible after scrolling ~30% of hero height.
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
      {/* Parallax image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || title || ''}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: 'auto',
          minHeight: '115%',
          objectFit: 'cover',
          display: 'block',
          willChange: 'transform',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      />

      {/* Dark gradient overlay — heavier at bottom */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.72) 80%, rgba(0,0,0,0.88) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Scroll-reveal title pinned to the bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 'clamp(24px, 4vw, 56px) clamp(24px, 6vw, 80px)',
        pointerEvents: 'none',
      }}>
        <h1
          ref={titleRef}
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: '#fff',
            fontSize: 'clamp(28px, 5vw, 72px)',
            lineHeight: '1.08',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            margin: 0,
            maxWidth: '860px',
            opacity: 0,
            transform: 'translateY(32px)',
            transition: 'none',
            textShadow: '0 2px 24px rgba(0,0,0,0.4)',
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  )
}
