'use client'

import { useEffect } from 'react'

export default function MissionAnimations() {
  useEffect(() => {
    const paragraphs = [
      ...document.querySelectorAll('.mission-reveal-intro > p')
    ]

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paragraphs.forEach(p => p.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = paragraphs.indexOf(entry.target)
            setTimeout(() => {
              entry.target.classList.add('is-visible')
            }, index * 180)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -35px 0px'
      }
    )

    paragraphs.forEach(p => observer.observe(p))

    const sections = [
      ...document.querySelectorAll('.mission-scroll-reveal')
    ]

    const sectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            sectionObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -45px 0px' }
    )

    sections.forEach(section => sectionObserver.observe(section))

    const cue = document.querySelector('.mission-scroll-cue')
    const updateCue = () => {
      if (cue) cue.classList.toggle('is-hidden', window.scrollY > 250)
    }

    updateCue()
    window.addEventListener('scroll', updateCue, { passive: true })

    return () => {
      observer.disconnect()
      sectionObserver.disconnect()
      window.removeEventListener('scroll', updateCue)
    }
  }, [])

  return null
}
