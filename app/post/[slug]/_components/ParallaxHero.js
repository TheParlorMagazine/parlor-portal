'use client'

import { useEffect, useRef } from 'react'

// Full-width hero for "The World We're Building" articles: the cover image with
// the title overlaid in a translucent panel, plus a very subtle parallax drift
// as the reader scrolls.
export default function ParallaxHero({ src, alt, title }) {
  const wrapRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    let raf = null
    const update = () => {
      raf = null
      const wrap = wrapRef.current
      const img = imgRef.current
      if (!wrap || !img) return
      const top = wrap.getBoundingClientRect().top
      // Subtle: drift up to ~36px, at ~8% of scroll offset. scale(1.12) gives
      // enough overscan that the edges never show.
      const shift = Math.max(-36, Math.min(36, -top * 0.08))
      img.style.transform = `translate3d(0, ${shift}px, 0) scale(1.12)`
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', width: '100%', overflow: 'hidden',
        height: 'clamp(360px, 62vh, 640px)', background: '#111', marginBottom: '40px',
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || title || ''}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', transform: 'scale(1.12)', willChange: 'transform',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          background: 'rgba(250, 247, 242, 0.82)', color: '#1a1a1a',
          padding: 'clamp(14px, 2.5vw, 26px) clamp(20px, 4vw, 44px)', margin: 0,
          maxWidth: '900px', textAlign: 'center', borderRadius: '2px',
          fontSize: 'clamp(28px, 5vw, 60px)', lineHeight: '1.1',
          fontWeight: '700', letterSpacing: '-0.01em',
        }}>
          {title}
        </h1>
      </div>
    </div>
  )
}
