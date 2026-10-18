'use client'

import { useState, useEffect, useRef } from 'react'

// Houses scroll left; witch stays fixed — neighborhood walk feel
// Each "lap" = 4 houses; bag fills as witch passes each house
const HOUSES = ['/house-h1.webp', '/house-h2.webp', '/house-h3.webp', '/house-h4.webp']
// 5 bag states: empty → full (frames extracted from the gif at 0,25,50,75,100%)
const BAG_FRAMES = ['/bag-stage-0.png', '/bag-stage-1.png', '/bag-stage-2.png', '/bag-stage-3.png', '/bag-stage-4.png']

export default function TrickOrTreatStrip({ href = '/trick-or-treat', heroSelector = 'main > *:nth-child(2)', bottomSelector = 'main > *:nth-child(4)' }) {
  const [heroGone, setHeroGone] = useState(false)
  const [bottomVisible, setBottomVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [bagFrame, setBagFrame] = useState(0)

  const visible = heroGone && !bottomVisible

  useEffect(() => { setMounted(true) }, [])

  // Show after hero image + caption scroll out of view
  useEffect(() => {
    if (!mounted) return
    const hero = document.querySelector(heroSelector)
    if (!hero) { setHeroGone(true); return }
    const obs = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting), { threshold: 0 })
    obs.observe(hero)
    return () => obs.disconnect()
  }, [mounted, heroSelector])

  // Hide when writer byline section comes into view
  useEffect(() => {
    if (!mounted) return
    const bottom = document.querySelector(bottomSelector)
    if (!bottom) return
    const obs = new IntersectionObserver(([e]) => setBottomVisible(e.isIntersecting), { threshold: 0 })
    obs.observe(bottom)
    return () => obs.disconnect()
  }, [mounted, bottomSelector])

  // Advance bag frame each time witch passes a house (every 2.5s = 10s scroll / 4 houses)
  // Start offset by 1.25s so frame 0 shows "between houses" before the first pass
  const intervalRef = useRef(null)
  useEffect(() => {
    if (!mounted) return
    const timeout = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setBagFrame(f => (f + 1) % BAG_FRAMES.length)
      }, 2500)
    }, 1250)
    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <>
      <style>{`
        .tot-strip {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: calc((100vw - 720px) / 2 - 16px);
          min-width: 80px;
          max-width: 260px;
          z-index: 90;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          pointer-events: none;
          transition: opacity 0.5s ease;
        }
        .tot-strip.hidden { opacity: 0; pointer-events: none; }
        .tot-strip.shown  { opacity: 1; pointer-events: auto; }
        @media (max-width: 1100px) { .tot-strip { display: none; } }

        .tot-inner {
          margin: 0 8px;
          background: rgba(12, 6, 28, 0.90);
          border-radius: 14px;
          border: 1px solid rgba(242, 184, 198, 0.35);
          padding: 14px 10px 18px;
          backdrop-filter: blur(6px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: background 0.2s;
          text-decoration: none;
          overflow: hidden;
        }
        .tot-inner:hover { background: rgba(20, 8, 40, 0.96); }

        .tot-label {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #f2b8c6;
          text-align: center;
          line-height: 1.4;
        }

        /* ── Tote bag panel ── */
        .tot-bag-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 3/4;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }
        .tot-bag-img {
          width: 88%;
          height: auto;
          object-fit: contain;
          display: block;
          border-radius: 8px;
          filter: drop-shadow(0 4px 12px rgba(242,184,198,0.25));
        }
        /* Bag frame crossfade */
        .tot-bag-img {
          transition: opacity 0.4s ease;
        }

        /* ── Scrolling street ── */
        .tot-street {
          position: relative;
          width: 100%;
          height: 76px;
          overflow: hidden;
          border-radius: 8px;
          background: #f5ede2;
        }

        /* Ground */
        .tot-ground {
          position: absolute;
          bottom: 0;
          left: 0; right: 0;
          height: 10px;
          background: #d4bfa8;
          border-top: 1px solid #c4a88e;
        }

        /* Scrolling house track */
        .tot-house-track {
          position: absolute;
          bottom: 8px;
          left: 0;
          display: flex;
          gap: 36px;
          align-items: flex-end;
          animation: tot-scroll 10s linear infinite;
          will-change: transform;
        }
        .tot-house-img {
          height: 52px;
          width: auto;
          object-fit: contain;
          display: block;
          flex-shrink: 0;
          filter: sepia(0.15) brightness(0.88);
        }
        @keyframes tot-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Witch — fixed, centered, native alpha so no blend mode needed */
        .tot-witch-img {
          position: absolute;
          bottom: 9px;
          left: 50%;
          transform: translateX(-50%);
          width: 42px;
          height: 42px;
          object-fit: contain;
          z-index: 2;
          animation: tot-bob 0.5s ease-in-out infinite alternate;
        }
        @keyframes tot-bob {
          from { transform: translateX(-50%) translateY(0px); }
          to   { transform: translateX(-50%) translateY(-3px); }
        }

        .tot-cta {
          display: block;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #1a0a20;
          background: #f2b8c6;
          border-radius: 20px;
          padding: 7px 14px;
          text-align: center;
          text-decoration: none;
          transition: background 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .tot-cta:hover { background: #e8a0b4; }
      `}</style>

      <div className={`tot-strip${visible ? ' shown' : ' hidden'}`} aria-hidden={!visible}>
        <a href={href} className="tot-inner" title="Trick or Treat at The Parlor">

          <div className="tot-label">Trick or Treat<br/>at The Parlor</div>

          {/* Tote bag — frame advances each time the witch passes a house */}
          <div className="tot-bag-wrap">
            <img
              src={BAG_FRAMES[bagFrame]}
              alt="The Parlor tote bag filling up with treats"
              className="tot-bag-img"
            />
          </div>

          {/* Scrolling street with witch */}
          <div className="tot-street">
            <div className="tot-house-track">
              {/* doubled for seamless loop */}
              {[...HOUSES, ...HOUSES].map((src, i) => (
                <img key={i} src={src} alt="" className="tot-house-img" />
              ))}
            </div>
            <img
              src="/witch-walk-right.png"
              alt="witch walking"
              className="tot-witch-img"
            />
            <div className="tot-ground" />
          </div>

          <span className="tot-cta">Join the fun →</span>
        </a>
      </div>
    </>
  )
}
