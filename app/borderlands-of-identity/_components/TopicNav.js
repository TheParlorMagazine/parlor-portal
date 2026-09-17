'use client'

import { useEffect } from 'react'
import { ISSUE, SECTIONS } from '../_data'

export default function TopicNav({ activeSlug }) {
  // Pin the subnav directly beneath the (sticky) site header, whatever its height.
  useEffect(() => {
    const header = document.querySelector('.site-header')
    if (!header) return
    function setOffset() {
      document.documentElement.style.setProperty(
        '--boi-header-h',
        `${Math.round(header.getBoundingClientRect().height)}px`
      )
    }
    setOffset()
    window.addEventListener('resize', setOffset)
    return () => window.removeEventListener('resize', setOffset)
  }, [])

  return (
    <nav className="boi-topicnav" aria-label="Issue chapters">
      <div className="boi-topicnav-inner">
        {SECTIONS.map(s => (
          <a
            key={s.slug}
            href={`/${ISSUE.slug}/${s.slug}`}
            className={`boi-topiclink${s.slug === activeSlug ? ' active' : ''}`}
            aria-current={s.slug === activeSlug ? 'page' : undefined}
          >
            {s.title}
          </a>
        ))}
      </div>
    </nav>
  )
}
