'use client'

import { useState, useEffect, useRef } from 'react'

const HOUSES = ['/house-h1.webp', '/house-h2.webp', '/house-h3.webp', '/house-h4.webp']

// Product name substrings to match (in order: house 1-4)
const ITEM_NAMES = ['Unicorn Snot', 'Tea with Tae', 'Badgerface', 'Village']

export default function TrickOrTreatStrip({ href = '/trick-or-treat', heroSelector = 'main > *:nth-child(2)', bottomSelector = 'main > *:nth-child(4)' }) {
  const [heroGone, setHeroGone] = useState(false)
  const [bottomVisible, setBottomVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [bagFrame, setBagFrame] = useState(0)
  const [itemImgs, setItemImgs] = useState([null, null, null, null])
  const [flyItem, setFlyItem] = useState(null) // { src, slot } while animating
  const bagIconRef = useRef(null)
  const slotsRef = useRef([])

  const visible = heroGone && !bottomVisible

  useEffect(() => { setMounted(true) }, [])

  // Fetch product images once
  useEffect(() => {
    fetch('/api/shop/products')
      .then(r => r.json())
      .then(({ products = [] }) => {
        const imgs = ITEM_NAMES.map(name =>
          products.find(p => p.name?.toLowerCase().includes(name.toLowerCase()))?.images?.[0] || null
        )
        setItemImgs(imgs)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!mounted) return
    const hero = document.querySelector(heroSelector)
    if (!hero) { setHeroGone(true); return }
    const obs = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting), { threshold: 0 })
    obs.observe(hero)
    return () => obs.disconnect()
  }, [mounted, heroSelector])

  useEffect(() => {
    if (!mounted) return
    const bottom = document.querySelector(bottomSelector)
    if (!bottom) return
    const obs = new IntersectionObserver(([e]) => setBottomVisible(e.isIntersecting), { threshold: 0 })
    obs.observe(bottom)
    return () => obs.disconnect()
  }, [mounted, bottomSelector])

  // Advance bag frame every 2.5s, trigger fly animation on each advance
  const intervalRef = useRef(null)
  useEffect(() => {
    if (!mounted) return
    const timeout = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setBagFrame(f => {
          const next = (f + 1) % 4
          const src = itemImgs[f] // item for the house we just passed
          if (src) {
            setFlyItem({ src, slot: f })
            setTimeout(() => setFlyItem(null), 800)
          }
          return next
        })
      }, 2500)
    }, 1250)
    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [mounted, itemImgs])

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
          background: rgba(12, 6, 28, 0.92);
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
          position: relative;
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

        /* ── Slot row (collected items) ── */
        .tot-slots {
          display: flex;
          gap: 5px;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .tot-slot {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1.5px dashed rgba(242,184,198,0.3);
          background: rgba(255,255,255,0.04);
          overflow: hidden;
          flex-shrink: 0;
          transition: border-color 0.3s;
        }
        .tot-slot.filled {
          border-style: solid;
          border-color: rgba(242,184,198,0.6);
        }
        .tot-slot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ── Fly animation ── */
        @keyframes tot-fly {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; border-radius: .75rem; }
          45%  { transform: translate(var(--fly-dx-mid), var(--fly-dy-mid)) scale(0.7) rotate(-6deg); opacity: 1; border-radius: .6rem; }
          100% { transform: translate(var(--fly-dx), var(--fly-dy)) scale(var(--fly-scale)); opacity: 0.9; border-radius: .45rem; }
        }
        .tot-flyer {
          position: fixed;
          z-index: 200;
          pointer-events: none;
          width: 80px;
          height: 80px;
          border-radius: .75rem;
          overflow: hidden;
          animation: tot-fly 0.75s cubic-bezier(.3,.7,.3,1) forwards;
        }
        .tot-flyer img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }

        /* ── Scrolling street ── */
        .tot-street {
          position: relative;
          width: 100%;
          height: 76px;
          overflow: hidden;
          border-radius: 8px;
          background: #1a0a28;
        }

        .tot-ground {
          position: absolute;
          bottom: 0;
          left: 0; right: 0;
          height: 10px;
          background: #3a1f10;
          border-top: 1px solid #5a3020;
        }

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
          filter: brightness(0.75) sepia(0.2);
        }
        @keyframes tot-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

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

      {/* Fly animation element — rendered at document level so it can animate across the full viewport */}
      {flyItem && (
        <FlyElement
          src={flyItem.src}
          slotEl={slotsRef.current[flyItem.slot]}
        />
      )}

      <div className={`tot-strip${visible ? ' shown' : ' hidden'}`} aria-hidden={!visible}>
        <a href={href} className="tot-inner" title="Trick or Treat at The Parlor">

          <div className="tot-label">Trick or Treat<br/>at The Parlor</div>

          {/* Collected item slots */}
          <div className="tot-slots">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                ref={el => slotsRef.current[i] = el}
                className={`tot-slot${bagFrame > i && itemImgs[i] ? ' filled' : ''}`}
              >
                {bagFrame > i && itemImgs[i] && (
                  <img src={itemImgs[i]} alt="" />
                )}
              </div>
            ))}
          </div>

          {/* Scrolling street with witch */}
          <div className="tot-street">
            <div className="tot-house-track">
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

// Separate component so it can read its own start/end rects after mount
function FlyElement({ src, slotEl }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !slotEl) return
    const a = ref.current.getBoundingClientRect()
    const b = slotEl.getBoundingClientRect()
    const FLYER = 80
    const dx = (b.left + b.width / 2) - (a.left + FLYER / 2)
    const dy = (b.top + b.height / 2) - (a.top + FLYER / 2)
    const scale = b.width / FLYER
    ref.current.style.setProperty('--fly-dx', `${dx}px`)
    ref.current.style.setProperty('--fly-dy', `${dy}px`)
    ref.current.style.setProperty('--fly-dx-mid', `${dx * 0.45}px`)
    ref.current.style.setProperty('--fly-dy-mid', `${dy * 0.45 - 50}px`)
    ref.current.style.setProperty('--fly-scale', scale)
  }, [slotEl])

  // Position above the strip's witch area — center of strip horizontally, roughly street level vertically
  const stripEl = typeof document !== 'undefined'
    ? document.querySelector('.tot-street')
    : null
  const rect = stripEl?.getBoundingClientRect()
  const left = rect ? rect.left + rect.width / 2 - 40 : 40
  const top = rect ? rect.top - 90 : 200

  return (
    <div
      ref={ref}
      className="tot-flyer"
      style={{ left, top }}
    >
      <img src={src} alt="" />
    </div>
  )
}
