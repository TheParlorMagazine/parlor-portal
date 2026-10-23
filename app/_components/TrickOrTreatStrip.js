'use client'

import { useState, useEffect, useRef } from 'react'

const HOUSES = ['/house-h1.webp', '/house-h2.webp', '/house-h3.webp', '/house-h4.webp']
// Door as a fraction of image width (0 = left edge, 1 = right edge)
const DOOR_X_RATIO = [0.43, 0.33, 0.28, 0.48]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function TrickOrTreatStrip({
  href = '/trick-or-treat',
  heroSelector = 'main > *:nth-child(2)',
  bottomSelector = 'main > *:nth-child(4)',
  bottomBar = false,
  shopPopup = false,
  onDismiss,
}) {
  const [shopMobile, setShopMobile] = useState(false)
  const [heroGone, setHeroGone]       = useState(false)
  const [everHidden, setEverHidden]   = useState(false)
  const [mounted, setMounted]         = useState(false)
  const [itemImgs, setItemImgs]       = useState([null, null, null, null])
  const [filledSlots, setFilledSlots] = useState([])
  const [spotlight, setSpotlight]     = useState(null)
  const [flyItem, setFlyItem]         = useState(null)
  const [trackPaused, setTrackPaused] = useState(false)

  // Desktop refs
  const slotsRef     = useRef([])
  const spotlightRef = useRef(null)
  const streetRef    = useRef(null)
  const innerRef     = useRef(null)
  // Mobile refs
  const slotsMobRef     = useRef([])
  const spotlightMobRef = useRef(null)
  const streetMobRef    = useRef(null)
  const mobContainerRef = useRef(null)
  // Shared
  const itemImgsRef    = useRef([null, null, null, null])
  const animatingRef   = useRef(false)
  const inZoneRef      = useRef(false)
  const slotCounterRef = useRef(0)
  const isMobileRef    = useRef(false)

  const visible = shopPopup ? (!shopMobile || heroGone) : heroGone && (bottomBar || !everHidden)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const update = () => { isMobileRef.current = window.innerWidth <= 1100; if (shopPopup) setShopMobile(isMobileRef.current) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [shopPopup])

  useEffect(() => {
    fetch('/api/trick-or-treat')
      .then(r => r.json())
      .then(({ houses = [] }) => {
        const imgs = houses.slice(0, 4).map(h => h.treats?.[0]?.product_image || null)
        itemImgsRef.current = imgs
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setEverHidden(true) }, { threshold: 0 })
    obs.observe(bottom)
    return () => obs.disconnect()
  }, [mounted, bottomSelector])

  useEffect(() => {
    if (!mounted) return
    let rafId
    const THRESHOLD = 22

    async function triggerAnimation(slot) {
      const src = itemImgsRef.current[slot]
      if (!src) { animatingRef.current = false; return }

      if (slot === 0) {
        setFilledSlots(prev => prev.length >= 4 ? [] : prev)
        await sleep(500)
      }

      setTrackPaused(true)
      setSpotlight({ src, slot })
      await sleep(850)
      setFlyItem({ src, slot })
      setSpotlight(null)
      await sleep(700)
      setFlyItem(null)
      setFilledSlots(prev => prev.includes(slot) ? prev : [...prev, slot])
      await sleep(450)
      setTrackPaused(false)
      await sleep(300)
      animatingRef.current = false
    }

    function check() {
      // Use whichever street scene is visible (non-zero rendered width)
      const dRect = streetRef.current?.getBoundingClientRect()
      const mRect = streetMobRef.current?.getBoundingClientRect()
      const street = (dRect && dRect.width > 0) ? streetRef.current
                   : (mRect && mRect.width  > 0) ? streetMobRef.current
                   : null

      if (street && !animatingRef.current) {
        const isMob = street === streetMobRef.current
        const DETECT_THRESHOLD = isMob ? 32 : THRESHOLD

        // Use actual witch element position
        const witchEl = street.querySelector('.tot-witch-img')
        const witchR  = witchEl?.getBoundingClientRect()
        const witchX  = witchR
          ? witchR.left + witchR.width / 2
          : street.getBoundingClientRect().left + street.getBoundingClientRect().width * 0.5

        const imgs = street.querySelectorAll('.tot-house-track img')
        let anyInZone = false

        for (let i = 0; i < imgs.length; i++) {
          const r = imgs[i].getBoundingClientRect()
          // On mobile use house center; on desktop use per-house door ratio
          const ratio = isMob ? 0.5 : DOOR_X_RATIO[i % 4]
          const doorX = r.left + r.width * ratio
          if (Math.abs(doorX - witchX) < DETECT_THRESHOLD) {
            anyInZone = true
            if (!inZoneRef.current) {
              inZoneRef.current = true
              const slot = slotCounterRef.current % 4
              slotCounterRef.current++
              animatingRef.current = true
              triggerAnimation(slot)
            }
            break
          }
        }

        if (!anyInZone) inZoneRef.current = false
      }

      rafId = requestAnimationFrame(check)
    }

    rafId = requestAnimationFrame(check)
    return () => cancelAnimationFrame(rafId)
  }, [mounted])

  if (!mounted) return null

  // In bottomBar mode always use the MobFlyElement (clipped to container)
  const mob = isMobileRef.current || bottomBar

  return (
    <>
      <style>{`
        /* ─── Desktop sidebar strip ─── */
        .tot-strip {
          position: fixed; left: 0; top: 0; bottom: 0;
          width: calc((100vw - 720px) / 2 - 12px);
          min-width: 120px; max-width: 340px;
          z-index: 90;
          display: flex; flex-direction: column;
          align-items: stretch; justify-content: center;
          pointer-events: none;
          transition: opacity 0.5s ease;
        }
        .tot-strip.hidden { opacity: 0; pointer-events: none; }
        .tot-strip.shown  { opacity: 1; pointer-events: auto; }
        @media (max-width: 1100px) { .tot-strip { display: none !important; } }

        .tot-inner {
          margin: 0 8px; background: #000;
          border-radius: 14px; border: 1px solid rgba(242,184,198,0.35);
          padding: 18px 12px 22px;
          display: flex; flex-direction: column;
          align-items: center; gap: 18px;
          cursor: pointer; transition: background 0.2s;
          text-decoration: none; position: relative; overflow: hidden;
        }
        .tot-inner:hover { background: #111; }

        .tot-label {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px; font-weight: 700; color: #f2b8c6;
          text-align: center; line-height: 1.25; position: relative; z-index: 3;
        }
        .tot-slots {
          display: flex; gap: 5px; align-items: center; justify-content: center;
          width: 100%; position: relative; z-index: 3;
        }
        .tot-slot {
          width: 52px; height: 52px; border-radius: 8px;
          border: 1.5px dashed rgba(242,184,198,0.3);
          background: rgba(255,255,255,0.04); overflow: hidden; flex-shrink: 0;
          transition: border-color 0.3s;
        }
        .tot-slot.filled { border-style: solid; border-color: rgba(242,184,198,0.6); }
        .tot-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* Desktop spotlight */
        .tot-spotlight {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%,-50%) scale(0);
          width: 130px; height: 130px; border-radius: 12px; overflow: hidden;
          z-index: 10; animation: tot-popin 0.35s cubic-bezier(.34,1.56,.64,1) forwards;
          box-shadow: 0 8px 32px rgba(242,184,198,0.4);
        }
        .tot-spotlight img { width: 100%; height: 100%; object-fit: cover; display: block; }
        @keyframes tot-popin {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }

        /* Fly animation */
        @keyframes tot-fly {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--fly-dx),var(--fly-dy)) scale(var(--fly-scale)); opacity: 0.9; }
        }
        .tot-flyer {
          position: absolute; z-index: 200; pointer-events: none;
          border-radius: 12px; overflow: hidden;
          animation: tot-fly 0.65s cubic-bezier(.4,0,.2,1) forwards;
        }
        .tot-flyer img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* Desktop street scene */
        .tot-street {
          position: relative; width: 100%; height: 240px;
          overflow: hidden; border-radius: 10px; background: #000; z-index: 1;
        }
        .tot-ground {
          position: absolute; bottom: 0; left: 0; right: 0; height: 14px;
          background: #3a1f10; border-top: 1px solid #5a3020; z-index: 2;
        }

        /* Shared house track */
        @keyframes tot-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .tot-house-track {
          position: absolute; bottom: 14px; left: 0;
          display: flex; width: max-content;
          animation: tot-scroll 7s linear infinite;
        }
        .tot-house-track.paused { animation-play-state: paused; }
        .tot-house-track img {
          height: 200px; width: auto; object-fit: contain; flex-shrink: 0;
          filter: brightness(0.78) sepia(0.15);
        }

        /* Witch */
        .tot-witch-img {
          position: absolute; bottom: 12px; left: 50%;
          transform: translateX(-50%);
          width: 80px; height: 80px; object-fit: contain; z-index: 3;
          animation: tot-bob 0.5s ease-in-out infinite alternate;
        }
        @keyframes tot-bob {
          from { transform: translateX(-50%) translateY(0px); }
          to   { transform: translateX(-50%) translateY(-3px); }
        }

        .tot-cta {
          display: block; font-family: 'Source Serif 4', Georgia, serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #1a0a20; background: #f2b8c6;
          border-radius: 0; padding: 11px 14px; text-align: center;
          text-decoration: none; transition: background 0.15s, font-size 0.15s;
          width: 100%; box-sizing: border-box; position: relative; z-index: 3;
        }
        .tot-cta:hover { background: #e8a0b4; font-size: 13px; font-weight: 800; }

        /* ─── Mobile horizontal strip ─── */
        .tot-mob {
          display: none; position: fixed; top: 0; left: 0; right: 0;
          z-index: 90; background: #000; overflow: hidden;
          border-bottom: 1px solid rgba(242,184,198,0.2);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .tot-mob.hidden { opacity: 0; transform: translateY(-100%); pointer-events: none; }
        .tot-mob.shown  { opacity: 1; transform: translateY(0);     pointer-events: auto; }
        @media (max-width: 1100px) { .tot-mob { display: block; } }

        /* ─── Bottom-bar mode (vertical pages) ─── */
        .tot-mob.tot-bottom-bar {
          display: block; top: auto; bottom: 0;
          border-bottom: none; border-top: 1px solid rgba(242,184,198,0.2);
        }
        .tot-mob.tot-bottom-bar.hidden { transform: translateY(100%); }
        .tot-mob.tot-bottom-bar.shown  { transform: translateY(0); }

        /* Top row: house animation scene */
        .tot-mob-scene {
          position: relative; height: 70px; background: #000;
          overflow: hidden;
        }
        .tot-mob-scene .tot-ground { height: 8px; }
        .tot-mob-scene .tot-house-track { bottom: 8px; gap: 6px; }
        /* Fixed box size so all houses are identical width for center detection */
        .tot-mob-scene .tot-house-track img { width: 116px !important; height: 58px !important; object-fit: contain; flex-shrink: 0; }
        /* Witch centered */
        .tot-mob-scene .tot-witch-img {
          width: 30px; height: 30px; bottom: 9px; left: 50%;
        }
        /* Left + right gradient edges */
        .tot-mob-scene::before,
        .tot-mob-scene::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 28px; z-index: 5; pointer-events: none;
        }
        .tot-mob-scene::before { left: 0;  background: linear-gradient(to right, #000, transparent); }
        .tot-mob-scene::after  { right: 0; background: linear-gradient(to left,  #000, transparent); }

        /* Mobile spotlight — absolute inside .tot-mob, vertically centered in the 70px scene */
        .tot-mob-spotlight {
          position: absolute; left: 50%; top: 35px;
          transform: translate(-50%,-50%) scale(0);
          width: 50px; height: 50px; border-radius: 7px; overflow: hidden;
          z-index: 20; animation: tot-popin 0.3s cubic-bezier(.34,1.56,.64,1) forwards;
          box-shadow: 0 4px 16px rgba(242,184,198,0.5);
          pointer-events: none;
        }
        .tot-mob-spotlight img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* Mobile fly: absolute inside .tot-mob (clipped by overflow:hidden on the strip) */
        @keyframes tot-fly-mob {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--fly-dx),var(--fly-dy)) scale(var(--fly-scale)); opacity: 0.9; }
        }
        .tot-flyer-mob {
          position: absolute; z-index: 25; pointer-events: none;
          border-radius: 7px; overflow: hidden;
          animation: tot-fly-mob 0.65s cubic-bezier(.4,0,.2,1) forwards;
        }
        .tot-flyer-mob img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* Bottom row: label + slots + button */
        .tot-mob-bottom {
          display: flex; align-items: center;
          padding: 0 0 0 12px; gap: 0;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .tot-mob-label {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 11.5px; font-weight: 700; color: #f2b8c6;
          line-height: 1.25; white-space: nowrap; flex-shrink: 0;
        }
        .tot-mob-slots {
          display: flex; gap: 4px; align-items: center;
          flex: 1; justify-content: center; padding: 5px 6px;
        }
        .tot-mob-slot {
          width: 26px; height: 26px; border-radius: 4px;
          border: 1.5px dashed rgba(242,184,198,0.3);
          background: rgba(255,255,255,0.06); overflow: hidden; flex-shrink: 0;
          transition: border-color 0.3s;
        }
        .tot-mob-slot.filled { border-style: solid; border-color: rgba(242,184,198,0.55); }
        .tot-mob-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .tot-mob-cta {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 8px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #1a0a20; background: #f2b8c6;
          padding: 3px 12px; text-decoration: none; white-space: nowrap;
          flex-shrink: 0; align-self: center; height: 26px;
          display: flex; align-items: center; margin-left: 0;
        }
      `}</style>

      {shopPopup && <style>{`
        .tot-strip.tot-shop-popup{left:16px;top:auto;bottom:16px;width:280px;min-width:0;max-width:280px;justify-content:flex-end}
        .tot-shop-popup .tot-inner{margin:0;box-shadow:0 8px 30px rgba(0,0,0,.2);padding-top:24px}
        .tot-shop-popup .tot-street{height:190px}
        .tot-shop-dismiss{position:absolute;right:7px;top:6px;z-index:30;width:28px;height:28px;border:1px solid rgba(242,184,198,.45);border-radius:50%;background:#111;color:#f2b8c6;font-size:22px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
        .tot-shop-dismiss:hover{background:#f2b8c6;color:#111}
        .tot-shop-dismiss:focus-visible{outline:2px solid #f2b8c6;outline-offset:3px}
        .tot-shop-popup.hidden .tot-shop-dismiss{visibility:hidden}
        .tot-shop-mobile.hidden .tot-shop-dismiss{visibility:hidden}
      `}</style>}

      {/* Mobile / bottom-bar strip — two rows: scene on top, label+slots+button below */}
      <div className={`tot-mob${shopPopup ? ' tot-shop-mobile' : ''}${bottomBar ? ' tot-bottom-bar' : ''}${visible ? ' shown' : ' hidden'}`}
           aria-hidden={!visible} ref={mobContainerRef}>
        {shopPopup && <button type="button" className="tot-shop-dismiss" onClick={onDismiss} aria-label="Dismiss shop Trick or Treat banner">×</button>}
        {/* Top: animated house scene */}
        <div className="tot-mob-scene" ref={streetMobRef}>
          <div className={`tot-house-track${trackPaused ? ' paused' : ''}`}>
            {[...HOUSES, ...HOUSES].map((src, i) => <img key={i} src={src} alt="" />)}
          </div>
          <img src="/witch-walk-right.png" alt="" className="tot-witch-img" />
          <div className="tot-ground" />
        </div>

        {/* Spotlight: absolute inside .tot-mob so it can span scene + bottom row */}
        {spotlight && (
          <div className="tot-mob-spotlight" ref={spotlightMobRef} key={`spm-${spotlight.slot}`}>
            <img src={spotlight.src} alt="" />
          </div>
        )}

        {/* Mobile fly: absolute inside .tot-mob — clipped by overflow:hidden */}
        {flyItem && mob && (
          <MobFlyElement
            key={`mfly-${flyItem.slot}-${slotCounterRef.current}`}
            src={flyItem.src}
            slotEl={slotsMobRef.current[flyItem.slot]}
            spotlightEl={spotlightMobRef.current}
            containerEl={mobContainerRef.current}
          />
        )}

        {/* Bottom: label + slots + CTA */}
        <div className="tot-mob-bottom">
          <div className="tot-mob-label">Trick or Treat<br/>at The Parlor</div>
          <div className="tot-mob-slots">
            {[0,1,2,3].map(i => (
              <div key={i} ref={el => slotsMobRef.current[i] = el}
                className={`tot-mob-slot${filledSlots.includes(i) ? ' filled' : ''}`}>
                {filledSlots.includes(i) && itemImgs[i] && <img src={itemImgs[i]} alt="" />}
              </div>
            ))}
          </div>
          <a href={href} className="tot-mob-cta">Join the fun →</a>
        </div>
      </div>

      {/* Desktop sidebar — hidden in bottomBar mode */}
      {!bottomBar && <div className={`tot-strip${shopPopup ? ' tot-shop-popup' : ''}${visible ? ' shown' : ' hidden'}`} aria-hidden={!visible}>
        {shopPopup && <button type="button" className="tot-shop-dismiss" onClick={onDismiss} aria-label="Dismiss shop Trick or Treat banner">×</button>}
        <a href={href} className="tot-inner" ref={innerRef} title="Trick or Treat at The Parlor">
          <div className="tot-label">Trick or Treat at<br/>The Parlor</div>

          <div className="tot-slots">
            {[0,1,2,3].map(i => (
              <div key={i} ref={el => slotsRef.current[i] = el}
                className={`tot-slot${filledSlots.includes(i) ? ' filled' : ''}`}>
                {filledSlots.includes(i) && itemImgs[i] && <img src={itemImgs[i]} alt="" />}
              </div>
            ))}
          </div>

          {spotlight && (
            <div className="tot-spotlight" ref={spotlightRef} key={`spd-${spotlight.slot}`}>
              <img src={spotlight.src} alt="" />
            </div>
          )}

          <div className="tot-street" ref={streetRef}>
            <div className={`tot-house-track${trackPaused ? ' paused' : ''}`}>
              {[...HOUSES, ...HOUSES].map((src, i) => <img key={i} src={src} alt="" />)}
            </div>
            <img src="/witch-walk-right.png" alt="" className="tot-witch-img" />
            <div className="tot-ground" />
          </div>

          {flyItem && !mob && (
            <FlyElement
              key={`fly-${flyItem.slot}-${slotCounterRef.current}`}
              src={flyItem.src}
              slotEl={slotsRef.current[flyItem.slot]}
              spotlightEl={spotlightRef.current}
              containerEl={innerRef.current}
              size={130}
            />
          )}

          <span className="tot-cta">Join the fun →</span>
        </a>
      </div>}
    </>
  )
}

function MobFlyElement({ src, slotEl, spotlightEl, containerEl }) {
  const SIZE = 50
  const ref = useRef(null)
  const cRect = containerEl?.getBoundingClientRect()
  const sRect = spotlightEl?.getBoundingClientRect()
  const startLeft = (cRect && sRect) ? sRect.left - cRect.left + sRect.width / 2 - SIZE / 2 : -999
  const startTop  = (cRect && sRect) ? sRect.top  - cRect.top  + sRect.height / 2 - SIZE / 2 : -999

  useEffect(() => {
    if (!ref.current || !slotEl || !cRect) return
    const b = slotEl.getBoundingClientRect()
    if (!b.width) return
    const dx = (b.left - cRect.left + b.width / 2)  - (startLeft + SIZE / 2)
    const dy = (b.top  - cRect.top  + b.height / 2) - (startTop  + SIZE / 2)
    ref.current.style.setProperty('--fly-dx', `${dx}px`)
    ref.current.style.setProperty('--fly-dy', `${dy}px`)
    ref.current.style.setProperty('--fly-scale', b.width / SIZE)
  }, [slotEl, startLeft, startTop])

  return (
    <div ref={ref} className="tot-flyer-mob"
      style={{ left: startLeft, top: startTop, width: SIZE, height: SIZE }}>
      <img src={src} alt="" />
    </div>
  )
}

function FlyElement({ src, slotEl, spotlightEl, containerEl, size = 130 }) {
  const ref = useRef(null)
  const cRect = containerEl?.getBoundingClientRect()
  const sRect = spotlightEl?.getBoundingClientRect()
  const startLeft = (cRect && sRect) ? sRect.left - cRect.left + sRect.width / 2 - size / 2 : -999
  const startTop  = (cRect && sRect) ? sRect.top  - cRect.top  + sRect.height / 2 - size / 2 : -999

  useEffect(() => {
    if (!ref.current || !slotEl || !cRect) return
    const b = slotEl.getBoundingClientRect()
    if (!b.width) return
    const dx = (b.left - cRect.left + b.width / 2)  - (startLeft + size / 2)
    const dy = (b.top  - cRect.top  + b.height / 2) - (startTop  + size / 2)
    ref.current.style.setProperty('--fly-dx', `${dx}px`)
    ref.current.style.setProperty('--fly-dy', `${dy}px`)
    ref.current.style.setProperty('--fly-scale', b.width / size)
  }, [slotEl, startLeft, startTop, size])

  return (
    <div ref={ref} className="tot-flyer"
      style={{ left: startLeft, top: startTop, width: size, height: size }}>
      <img src={src} alt="" />
    </div>
  )
}
