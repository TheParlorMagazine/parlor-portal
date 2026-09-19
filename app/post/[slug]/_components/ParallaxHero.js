'use client'

import { useEffect, useRef } from 'react'

// Hero for "The World We're Building" articles: the FULL cover image (never
// cropped) with the title overlaid in a translucent panel. A very subtle
// parallax drifts the title over the image as the reader scrolls.
export default function ParallaxHero({ src, alt, title }) {
  const wrapRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    let raf = null
    const update = () => {
      raf = null
      const wrap = wrapRef.current
      const el = titleRef.current
      if (!wrap || !el) return
      const top = wrap.getBoundingClientRect().top
      // Title drifts relative to the image as you scroll (keeps the image uncropped).
      const shift = Math.max(-110, Math.min(110, top * 0.22))
      el.style.transform = `translate(-50%, calc(-50% + ${shift}px))`
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
    <div ref={wrapRef} style={{ width: '100%', maxWidth: '1040px', margin: '0 auto 20px', padding: '0 24px' }}>
      <div style={{ position: 'relative' }}>
        <img
          src={src}
          alt={alt || title || ''}
          style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '2px' }}
        />
        <h1
          ref={titleRef}
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontFamily: "'Playfair Display', Georgia, serif",
            background: 'rgba(250, 247, 242, 0.82)', color: '#1a1a1a',
            padding: 'clamp(12px, 2.2vw, 24px) clamp(18px, 3.5vw, 40px)', margin: 0,
            width: 'max-content', maxWidth: '88%', textAlign: 'center', boxSizing: 'border-box',
            fontSize: 'clamp(22px, 3.6vw, 46px)', lineHeight: '1.12',
            fontWeight: '700', letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  )
}
