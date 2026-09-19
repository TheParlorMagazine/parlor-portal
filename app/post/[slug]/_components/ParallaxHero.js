'use client'

import { useEffect, useRef, useState } from 'react'

// Hero for "The World We're Building" articles. The title stays fixed while the
// cover IMAGE drifts (true parallax). The frame shows ~80% of the image height
// at once and the image slides as you scroll, so the whole illustration is
// revealed over the scroll — full width, never permanently cropped.
export default function ParallaxHero({ src, alt, title }) {
  const wrapRef = useRef(null)
  const imgRef = useRef(null)
  const [frameH, setFrameH] = useState(0)

  useEffect(() => {
    let raf = null
    const update = () => {
      raf = null
      const wrap = wrapRef.current
      const img = imgRef.current
      if (!wrap || !img) return
      const extra = Math.max(0, img.offsetHeight - wrap.offsetHeight)
      const rect = wrap.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight || 1
      // 0 as the hero enters from the bottom, 1 as it exits the top.
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)))
      img.style.transform = `translateY(${(-progress * extra).toFixed(1)}px)`
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    const measure = () => {
      const img = imgRef.current
      if (img && img.offsetHeight) setFrameH(Math.round(img.offsetHeight * 0.8))
      onScroll()
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [frameH])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', width: '100%', maxWidth: '1040px', margin: '0 auto 20px',
        height: frameH ? `${frameH}px` : 'clamp(360px, 66vh, 620px)',
        overflow: 'hidden', background: '#f7f4ef', borderRadius: '2px',
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || title || ''}
        onLoad={() => {
          const img = imgRef.current
          if (img && img.offsetHeight) setFrameH(Math.round(img.offsetHeight * 0.8))
        }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto',
          display: 'block', willChange: 'transform',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '24px', pointerEvents: 'none',
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          background: 'rgba(250, 247, 242, 0.82)', color: '#1a1a1a',
          padding: 'clamp(12px, 2.2vw, 24px) clamp(18px, 3.5vw, 40px)', margin: 0,
          width: 'max-content', maxWidth: '88%', textAlign: 'center', boxSizing: 'border-box',
          fontSize: 'clamp(22px, 3.6vw, 46px)', lineHeight: '1.12',
          fontWeight: '700', letterSpacing: '-0.01em',
        }}>
          {title}
        </h1>
      </div>
    </div>
  )
}
