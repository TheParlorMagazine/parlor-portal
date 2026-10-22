'use client'

import { useEffect } from 'react'
import MissionJoinCard from './MissionJoinCard'
import './mobile-mission.css'

export default function MobileMission() {
  useEffect(() => {
    const header = document.querySelector('.mission-page > a[href="/"]')
    if (!header) return

    let previousY = window.scrollY
    let lastDirection = 0

    function handleScroll() {
      const currentY = window.scrollY
      const difference = currentY - previousY

      if (currentY < 50) {
        header.style.setProperty('transform', 'translateY(0)', 'important')
      } else if (difference > 0) {
        lastDirection = 1
        header.style.setProperty('transform', 'translateY(-110%)', 'important')
      } else if (difference < 0) {
        lastDirection = -1
        header.style.setProperty('transform', 'translateY(0)', 'important')
      }

      previousY = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      header.style.removeProperty('transform')
    }
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll('.mobile-mission .mobile-reveal')
    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="mobile-mission">
      <header className="mobile-mission-hero">
        <div className="mobile-mission-intro">
          <span className="mobile-mission-eyebrow">OUR MISSION</span>
          <h1>A Room of Our Own.<br />With Sharp Furniture.</h1>
          <p>Independent journalism for a world worth reimagining.</p>
        </div>
        <div className="mobile-mission-artwork" role="img" aria-label="An illustrated Victorian parlor with women reading, a settee, gramophone, and tea table">
          <img className="mobile-mission-image" src="/mission-room/the%20room.png" alt="" />
          {[
            { file: 'sette and gramaphone.png', x: 336, y: 487, w: 555, h: 312 },
            { file: 'Victorian Woman Reading The Parlor 1@2x.png', x: 0, y: 463, w: 601, h: 549 },
            { file: 'woman reading a book.png', x: 891, y: 351, w: 299, h: 448 },
            { file: 'tabnle and chairs.png', x: 976, y: 579, w: 476, h: 318 },
          ].map(layer => (
            <img
              key={layer.file}
              className="mobile-mission-layer"
              src={'/mission-room/' + encodeURIComponent(layer.file)}
              alt=""
              style={{
                left: `${layer.x / 1500 * 100}%`,
                top: `${layer.y / 1000 * 100}%`,
                width: `${layer.w / 1500 * 100}%`,
                height: `${layer.h / 1000 * 100}%`,
              }}
            />
          ))}
        </div>
        <span className="mobile-mission-scroll">SCROLL TO EXPLORE ↓</span>
      </header>

      <main className="mobile-mission-content">
        

        <section className="mobile-reveal">
          <h2>Beyond the Status Quo</h2>
          <p>We're an independent magazine exploring the intersections of culture, politics, identity, labor, and power. Through journalism, essays, criticism, and conversations, we challenge conventional wisdom, question the systems we've inherited, and amplify perspectives too often pushed to the margins.</p>
          <p>From grassroots movements and mutual aid networks to cooperative economies and new models of collective care, we're particularly interested in the people building alternatives to systems that no longer serve us.</p>
        </section>

        <section className="mobile-reveal">
          <h2>Our Perspective</h2>
          <p>Our editorial perspective is feminist, intersectional, anticolonial, and critical of systems that concentrate wealth and power at the expense of people and the planet.</p>
          <p>But we're not interested in ideological purity tests or preaching to the converted.</p>
          <p>We believe in rigorous journalism, intellectual curiosity, thoughtful disagreement, and the occasional well-placed swear word.</p>
          <p>We don't pretend to have all the answers. We'd rather ask better questions.</p>
        </section>

        <section className="mobile-reveal">
          <h2>More Than a Seat at the Table</h2>
          <p>For too long, the conversation has been dominated by the same voices, institutions, and assumptions.</p>
          <p>We're here to make space for different perspectives, inconvenient truths, ambitious ideas, and the people imagining something beyond the status quo.</p>
          <p>Because we're not simply interested in who gets a seat at the table.</p>
          <p className="mobile-mission-closing">We're interested in who's building an entirely different room.</p>
        </section>

        <section className="mobile-reveal mobile-mission-join" aria-label="Join The Parlor">
          <MissionJoinCard />
        </section>
      </main>


    </div>
  )
}
