'use client'

import { useEffect, useRef } from 'react'
import ArticleCard from './ArticleCard'

export default function TopicCards({ articles = [], disableScrollArrows = false }) {
  const scrollerRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const arrowsOff = !!disableScrollArrows

  useEffect(() => {
    if (arrowsOff) return
    const scroller = scrollerRef.current
    if (!scroller) return

    function update() {
      const left = leftRef.current
      const right = rightRef.current
      if (!left || !right) return
      const canScroll = scroller.scrollWidth > scroller.clientWidth + 2
      if (!canScroll) {
        left.classList.add('boi-hidden')
        right.classList.add('boi-hidden')
        return
      }
      const maxLeft = scroller.scrollWidth - scroller.clientWidth
      const sl = scroller.scrollLeft
      left.classList.toggle('boi-hidden', sl <= 1)
      right.classList.toggle('boi-hidden', sl >= maxLeft - 1)
    }

    update()
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [arrowsOff])

  function scrollBy(dir) {
    const scroller = scrollerRef.current
    if (!scroller) return
    const step = Math.min(420, scroller.clientWidth * 0.9)
    scroller.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div className="boi-cards-wrap">
      {!arrowsOff && (
        <button
          className="boi-scroll-btn left"
          type="button"
          aria-label="Scroll left"
          ref={leftRef}
          onClick={() => scrollBy(-1)}
        >
          ‹
        </button>
      )}

      <div className="boi-cards" role="list" ref={scrollerRef}>
        {articles.map((a, i) => (
          <ArticleCard a={a} key={i} />
        ))}
      </div>

      {!arrowsOff && (
        <button
          className="boi-scroll-btn right"
          type="button"
          aria-label="Scroll right"
          ref={rightRef}
          onClick={() => scrollBy(1)}
        >
          ›
        </button>
      )}
    </div>
  )
}
