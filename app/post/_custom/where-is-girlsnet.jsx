'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const BOYS_BUILDINGS = [
  { id: 'berners-lee', name: 'Tim Berners-Lee', year: '1989', contribution: 'World Wide Web', height: 480, width: 120, color: '#2d1b3d', windowRgb: '255,179,198' },
  { id: 'jobs-woz', name: 'Jobs & Wozniak', year: '1976', contribution: 'Apple Computer', height: 420, width: 135, color: '#3d1f4a', windowRgb: '255,143,171' },
  { id: 'gates', name: 'Bill Gates', year: '1975', contribution: 'Microsoft', height: 450, width: 112, color: '#4a1942', windowRgb: '255,214,224' },
  { id: 'zuckerberg', name: 'Mark Zuckerberg', year: '2004', contribution: 'Facebook/Meta', height: 390, width: 128, color: '#2a1535', windowRgb: '255,107,157' },
  { id: 'brin', name: 'Sergey Brin', year: '1998', contribution: 'Google', height: 435, width: 105, color: '#3a1645', windowRgb: '255,204,213' },
]


const BUILDING_WINDOWS = BOYS_BUILDINGS.map((b, bi) =>
  [...Array(Math.floor(b.width / 18) * Math.floor(b.height / 20))]
    .map((_, wi) => seededRandom(bi * 1000 + wi) > 0.35
      ? 0.3 + seededRandom(bi * 500 + wi) * 0.4
      : 0
    )
)

const BUILDING_WINDOW_ANIMS = BOYS_BUILDINGS.map((b, bi) =>
  [...Array(Math.floor(b.width / 18) * Math.floor(b.height / 20))]
    .map((_, wi) => ({
      delay: (seededRandom(bi * 777 + wi) * 6).toFixed(2),
      duration: (1.5 + seededRandom(bi * 333 + wi) * 3.5).toFixed(2),
    }))
)

const UNDERGROUND_NODES = [
  { label: 'Grace Hopper', year: '1952', contribution: 'COBOL & A-0 Compiler' },
  { label: 'Elizabeth Feinler', year: '1972', contribution: "Internet's Address System" },
  { label: 'Radia Perlman', year: '1985', contribution: 'Spanning Tree Protocol' },
  { label: 'Margaret Hamilton', year: '1965', contribution: 'Software Engineering' },
]

const UNDERGROUND_SENTENCES = [
  "But every city is built on something.",
  "Before the skyscrapers, there were the people who made them possible.",
  "They didn't get naming rights.",
  "They built the pipes.",
]

const NAV_BEATS = [
  { label: 'Where is girlsnet?' },
  { label: 'Cityscape appears' },
  { label: 'Prose text scrolling' },
  { label: 'Underground reveals' },
  { label: 'Grace Hopper' },
  { label: 'Elizabeth Feinler' },
  { label: 'Radia Perlman' },
  { label: 'Margaret Hamilton' },
]

const PROSE_PARAS = [
  "Right now, billions of people live and work in the same city.",
  "It's a young city, even by modern standards—just eighty years old, forty if you're only counting when it became open to the public.",
  "It started, as all cities do, with a few pioneers eking out a meager living in a vast frontier. Day after day, their diligent labor yielded exponential results. The city grew from a small patch of ground into a humming little neighborhood. Then a group of them. Eventually, it built structures which now govern the world. Towering monoliths that militaries, governments, and megacorporations call home, rising among the bustling neighborhoods that make up its majority, occupied by most of the global population.",
  "The Founding Fathers of this city are well known: Tim Berners-Lee. Jobs and Wozniak. Gates. Newer aristocrats have emerged too, like Zuckerberg, Brin, Altman, and Thiel. The cultures and attitudes they left behind, or are actively shaping, currently appear to hold the reins of power. Their hand steers the city towards their horizon.",
]


function splitSentences(text) {
  return text.split(/\.\s+/).map((s, i, arr) =>
    i < arr.length - 1 ? s + '.' : s
  ).filter(s => s.trim())
}

const ALL_SENTENCES = PROSE_PARAS.flatMap(splitSentences)

const FadeLine = forwardRef(function FadeLine({ children }, forwardedRef) {
  const innerRef = useRef(null)
  const rafRef = useRef(null)

  // Merge forwardedRef with innerRef so both point to the same element.
  // The lift RAF reads position via forwardedRef; this RAF controls opacity — no interference.
  const setRef = (el) => {
    innerRef.current = el
    if (forwardedRef) {
      if (typeof forwardedRef === 'function') forwardedRef(el)
      else forwardedRef.current = el
    }
  }

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const update = () => {
      const vh = window.innerHeight
      const top = el.getBoundingClientRect().top / vh

      let opacity, translateY

      if (top > 0.8) {
        opacity = 0
        translateY = 20
      } else if (top > 0.65) {
        const t = (0.8 - top) / 0.15
        opacity = t
        translateY = (1 - t) * 20
      } else if (top > 0.25) {
        opacity = 1
        translateY = 0
      } else if (top > 0.1) {
        opacity = (top - 0.1) / 0.15
        translateY = 0
      } else {
        opacity = 0
        translateY = 0
      }

      el.style.opacity = opacity
      el.style.transform = `translateY(${translateY}px)`
      rafRef.current = requestAnimationFrame(update)
    }

    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div ref={setRef} style={{
      fontSize: 'clamp(1rem, 2vw, 1.2rem)',
      lineHeight: 1.9,
      color: '#ddc8d0',
      margin: '0 0 0.6em',
      opacity: 0,
    }}>
      {children}
    </div>
  )
})

export default function GirlsnetCityscape({ article }) {
  const COVER_IMAGE = article?.cover_image_url || ''

  const [scrollY, setScrollY] = useState(0)
  const [activeBuilding, setActiveBuilding] = useState(null)
  const [hoveredDot, setHoveredDot] = useState(null)
  const containerRef = useRef(null)
  const undergroundRef = useRef(null)
  const horizonRef = useRef(null)
  const buildingsWrapperRef = useRef(null)
  const buildingsRowRef = useRef(null)
  const gradientMaskRef = useRef(null)
  const labelRefs = useRef([])
  const firstUndergroundRef = useRef(null)
  const navDotRefs = useRef([])
  const undergroundTextRefs = useRef([])
  const undergroundTextContainerRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // RAF loop drives lift, building fade, label reveals, and nav dot active state
  useEffect(() => {
    let rafId
    const update = () => {
      const vh = window.innerHeight
      const sy = window.scrollY

      // Lift: 0→1 as horizonRef scrolls from top=0.10 to top=-0.20
      let lift = 0
      if (horizonRef.current) {
        const top = horizonRef.current.getBoundingClientRect().top / vh
        lift = Math.max(0, Math.min((0.10 - top) / 0.30, 1))
      }
      if (buildingsWrapperRef.current) {
        buildingsWrapperRef.current.style.transform = `translateY(-${lift * 60}vh)`
      }
      if (gradientMaskRef.current) {
        gradientMaskRef.current.style.opacity = Math.max(0, 1 - lift * 2)
      }

      // Underground progress (computed before buildings fade so fade can use it)
      let undergroundProgress = 0
      if (undergroundRef.current) {
        const rect = undergroundRef.current.getBoundingClientRect()
        undergroundProgress = Math.max(0, Math.min((vh - rect.top) / rect.height, 1))
      }

      // Buildings row fade: 1→0 as undergroundProgress goes from 0.05 to 0.20
      if (buildingsRowRef.current) {
        buildingsRowRef.current.style.opacity = String(
          Math.max(0, Math.min(1 - undergroundProgress / 0.15, 1))
        )
      }

      // Label opacity
      const LABEL_THRESHOLDS = [0.1, 0.25, 0.4, 0.55]
      labelRefs.current.forEach((el, i) => {
        if (el) el.style.opacity = undergroundProgress >= LABEL_THRESHOLDS[i] ? '1' : '0'
      })

      // Teleprompter roll: visible once buildings fully fade (buildingOpacity < 0.15)
      // Roll maps undergroundProgress [0.15, 0.50] → t [0, 1]
      // rollOffset: +140px (sentence 0 entering from below) → -175px (sentence 3 exited above)
      const buildingOpacity = Math.max(0, Math.min(1 - (undergroundProgress - 0.05) / 0.15, 1))
      const S = 70
      const zone = S / 2
      const t = Math.max(0, Math.min((undergroundProgress - 0.15) / 0.35, 1))
      const rollOffset = 140 - t * 315
      if (undergroundTextContainerRef.current) {
        const containerOpacity = Math.max(0, Math.min((0.15 - buildingOpacity) / 0.05, 1))
        undergroundTextContainerRef.current.style.opacity = String(containerOpacity)
        undergroundTextContainerRef.current.style.transform =
          `translate(-50%, calc(-50% + ${rollOffset}px))`
      }
      undergroundTextRefs.current.forEach((el, i) => {
        if (!el) return
        const dist = rollOffset + (i - 1.5) * S
        let opacity
        if (dist > zone) opacity = 0
        else if (dist > 0) opacity = (zone - dist) / zone
        else if (dist > -zone) opacity = 1
        else if (dist > -2 * zone) opacity = (dist + 2 * zone) / zone
        else opacity = 0
        el.style.opacity = String(Math.max(0, opacity))
      })

      // Nav dots: active = current beat (pink), past = dim pink, future = hollow
      const prog = Math.min(sy / 600, 1)
      let activeDot = 0
      if (sy >= 200) activeDot = 1
      if (prog >= 1) activeDot = 2
      if (lift > 0.01) activeDot = 3
      if (undergroundProgress >= 0.1) activeDot = 4
      if (undergroundProgress >= 0.25) activeDot = 5
      if (undergroundProgress >= 0.4) activeDot = 6
      if (undergroundProgress >= 0.55) activeDot = 7
      navDotRefs.current.forEach((el, i) => {
        if (!el) return
        if (i === activeDot) {
          el.style.background = '#f9a8d4'
          el.style.borderColor = '#f9a8d4'
        } else if (i < activeDot) {
          el.style.background = 'rgba(249,168,212,0.4)'
          el.style.borderColor = 'rgba(249,168,212,0.4)'
        } else {
          el.style.background = 'transparent'
          el.style.borderColor = 'rgba(255,255,255,0.2)'
        }
      })

      rafId = requestAnimationFrame(update)
    }
    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const getSectionOffset = (i) => {
    const vh = window.innerHeight
    const sy = window.scrollY
    if (i === 0) return 0
    if (i === 1) return 200
    if (i === 2) return 650
    if (i === 3 && horizonRef.current) {
      return Math.max(0, horizonRef.current.getBoundingClientRect().top + sy - 0.10 * vh)
    }
    if (i >= 4 && undergroundRef.current) {
      const secTop = undergroundRef.current.getBoundingClientRect().top + sy
      const secH = undergroundRef.current.offsetHeight
      const t = [0.1, 0.25, 0.4, 0.55][i - 4]
      return Math.max(0, secTop - vh + t * secH)
    }
    return 0
  }

  const progress = Math.min(scrollY / 600, 1)
  const cityFullyVisible = progress > 0.7

  return (
    <div style={{ background: '#000000', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#fff' }}>

      {/* ── COVER IMAGE OVERLAY ── */}
      {COVER_IMAGE && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 15,
          opacity: Math.max(0, 1 - scrollY / 400),
          pointerEvents: scrollY > 380 ? 'none' : 'auto',
        }}>
          <img src={COVER_IMAGE} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)' }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '0 40px',
          }}>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.15, margin: '0 0 20px', color: '#ffffff' }}>
              Where is girlsnet?
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#ffb3c6', lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
              From forgotten forums to billion-dollar feeds,<br />
              women have been shaping the Internet since its first lines of code.
            </p>
            <div style={{ marginTop: 32, color: '#fff', fontSize: 13, animation: 'pulse 2s infinite' }}>
              ↓ scroll to enter the city
            </div>
          </div>
        </div>
      )}

      {/* ── LAYER 0: BACKGROUND — fixed sky + stars, behind everything ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom,
            hsl(0, 0%, ${4 + progress * 7}%) 0%,
            hsl(0, 0%, ${7 + progress * 10}%) 60%,
            #000000 100%)`
        }} />
        {[...Array(40)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 23 + 7) % 50}%`,
            width: i % 5 === 0 ? 2 : 1,
            height: i % 5 === 0 ? 2 : 1,
            borderRadius: '50%',
            background: '#fff',
            opacity: 0.3 + (i % 4) * 0.15,
          }} />
        ))}
      </div>

      {/* ── LAYER 3: CITYSCAPE BUILDINGS — fixed, no background, sits on top of prose ── */}
      {/* Transparent container: only the building shapes themselves occlude the text */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 3, overflow: 'hidden', pointerEvents: 'none' }}>

        {/* BOYS BUILDINGS + IMAGE — both inside same translateY wrapper so they rise as one unit.
            Wrapper fills the viewport (inset:0). A height:100% spacer pushes the image div
            below the fold initially; the absolutely-anchored buildings row stays at viewport bottom.
            overflow:hidden on the parent clips the image until the translateY lift reveals it. */}
        <div
          ref={buildingsWrapperRef}
          style={{ position: 'absolute', inset: 0, background: 'transparent' }}
        >
          {/* Spacer — fills 100% of wrapper height, pushing image div below viewport */}
          <div style={{ height: '100%' }} />

          {/* Subway map image — position:relative container, no absolute/fixed.
              Flows after spacer so it starts at viewport bottom, hidden until buildings lift. */}
          <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            <img
              src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779777616/subway-map_emjfsj.png"
              alt=""
              style={{ width: '100%', display: 'block' }}
            />
            {/* Gradient pinned to image bottom — moves with image as buildings lift */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '120px',
              background: 'linear-gradient(to bottom, transparent 0%, black 100%)',
              pointerEvents: 'none',
            }} />
            {/* 01 — Grace Hopper · circle ~18% left, ~65% top */}
            <div
              ref={el => { labelRefs.current[0] = el }}
              style={{
                position: 'absolute', left: '18%', top: '65%', zIndex: 50,
                transform: 'translate(-50%, -100%) translateY(-8px)',
                opacity: 0, transition: 'opacity 0.5s ease',
                background: 'rgba(0,0,0,0.7)', padding: '6px 10px', borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>Grace Hopper</div>
              <div style={{ fontSize: 10, color: '#f9a8d4' }}>1952</div>
              <div style={{ fontSize: 10, color: '#a78bfa', fontStyle: 'italic' }}>COBOL & A-0 Compiler</div>
            </div>
            {/* 02 — Elizabeth Feinler · circle ~39% left, ~47% top */}
            <div
              ref={el => { labelRefs.current[1] = el }}
              style={{
                position: 'absolute', left: '39%', top: '47%', zIndex: 50,
                transform: 'translate(-50%, -100%) translateY(-8px)',
                opacity: 0, transition: 'opacity 0.5s ease',
                background: 'rgba(0,0,0,0.7)', padding: '6px 10px', borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>Elizabeth Feinler</div>
              <div style={{ fontSize: 10, color: '#f9a8d4' }}>1972</div>
              <div style={{ fontSize: 10, color: '#a78bfa', fontStyle: 'italic' }}>Internet's Address System</div>
            </div>
            {/* 03 — Radia Perlman · circle ~61% left, ~67% top */}
            <div
              ref={el => { labelRefs.current[2] = el }}
              style={{
                position: 'absolute', left: '61%', top: '67%', zIndex: 50,
                transform: 'translate(-50%, -100%) translateY(-8px)',
                opacity: 0, transition: 'opacity 0.5s ease',
                background: 'rgba(0,0,0,0.7)', padding: '6px 10px', borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>Radia Perlman</div>
              <div style={{ fontSize: 10, color: '#f9a8d4' }}>1985</div>
              <div style={{ fontSize: 10, color: '#a78bfa', fontStyle: 'italic' }}>Spanning Tree Protocol</div>
            </div>
            {/* 04 — Margaret Hamilton · circle ~82% left, ~40% top */}
            <div
              ref={el => { labelRefs.current[3] = el }}
              style={{
                position: 'absolute', left: '82%', top: '40%', zIndex: 50,
                transform: 'translate(-50%, -100%) translateY(-8px)',
                opacity: 0, transition: 'opacity 0.5s ease',
                background: 'rgba(0,0,0,0.7)', padding: '6px 10px', borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>Margaret Hamilton</div>
              <div style={{ fontSize: 10, color: '#f9a8d4' }}>1965</div>
              <div style={{ fontSize: 10, color: '#a78bfa', fontStyle: 'italic' }}>Software Engineering</div>
            </div>
          </div>

          {/* Buildings row — position:absolute anchored to wrapper bottom = viewport bottom */}
          <div ref={buildingsRowRef} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'center', gap: 12, padding: '0 40px',
          }}>
          {BOYS_BUILDINGS.map((b, i) => {
            const delay = i * 0.12
            const buildProgress = Math.max(0, Math.min((progress - delay) / 0.4, 1))
            const eased = 1 - Math.pow(1 - buildProgress, 3)
            return (
              <div
                key={b.id}
                style={{ position: 'relative', cursor: 'pointer', pointerEvents: 'auto' }}
                onMouseEnter={() => setActiveBuilding(b.id)}
                onMouseLeave={() => setActiveBuilding(null)}
              >
                {activeBuilding === b.id && (
                  <div style={{
                    position: 'absolute', bottom: '105%', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(10,10,26,0.95)',
                    border: '1px solid #333',
                    borderRadius: 8, padding: '10px 14px',
                    whiteSpace: 'nowrap', zIndex: 20,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{b.contribution} · {b.year}</div>
                  </div>
                )}
                <div style={{
                  width: b.width,
                  height: b.height * eased,
                  background: `linear-gradient(to top, ${b.color}, ${b.color}dd)`,
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderBottom: 'none',
                  transition: 'filter 0.2s',
                  filter: activeBuilding === b.id ? 'brightness(1.4)' : 'brightness(1)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: '8px 6px',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.floor(b.width / 18)}, 1fr)`,
                    gap: 4,
                  }}>
                    {BUILDING_WINDOWS[i].map((opacity, wi) => {
                      const anim = BUILDING_WINDOW_ANIMS[i][wi]
                      return (
                        <div key={wi} style={{
                          background: opacity > 0
                            ? `rgba(${b.windowRgb}, ${opacity})`
                            : 'transparent',
                          borderRadius: 1,
                          aspectRatio: '1',
                          ...(opacity > 0 && {
                            animation: `twinkle ${anim.duration}s ease-in-out ${anim.delay}s infinite`,
                          }),
                        }} />
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>

      </div>

      {/* ── LAYER 4: HEADER — fixed, always on top of buildings ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none' }}>

        {/* Opening text — only shown when there is no cover image */}
        <div style={{
          position: 'absolute', top: '12%', left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center', width: '90%', maxWidth: 680,
          opacity: COVER_IMAGE ? 0 : Math.max(0, 1 - progress * 3),
          transition: 'opacity 0.3s',
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700, lineHeight: 1.15, margin: '0 0 20px',
            color: '#ffffff',
          }}>
            Where is girlsnet?
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#ffb3c6', lineHeight: 1.7, margin: 0 }}>
            From forgotten forums to billion-dollar feeds,<br />
            women have been shaping the Internet since its first lines of code.
          </p>
          <div style={{ marginTop: 32, color: '#fff', fontSize: 13, animation: 'pulse 2s infinite' }}>
            ↓ scroll to enter the city
          </div>
        </div>

        {/* City label — fades in once city is fully visible */}
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          opacity: cityFullyVisible ? 1 : 0,
          transition: 'opacity 0.8s ease',
          width: '90%',
        }}>
          <div style={{
            fontSize: 'clamp(1.2rem, 3.5vw, 2.5rem)',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            The Internet
          </div>
          <div style={{
            fontSize: 'clamp(0.7rem, 1.6vw, 1rem)',
            color: '#ffb3c6',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginTop: 8,
          }}>
            Est. 1969
          </div>
        </div>

        {/* Scroll journey indicator — 8 beats, RAF-driven active dot */}
        <div style={{
          position: 'absolute', right: 20, top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 14,
          pointerEvents: 'auto',
        }}>
          {/* Connecting line behind dots */}
          <div style={{
            position: 'absolute', top: 4, bottom: 4,
            left: '50%', transform: 'translateX(-50%)',
            width: 1,
            background: 'rgba(255,255,255,0.12)',
            zIndex: 0,
          }} />

          {NAV_BEATS.map((beat, i) => (
            <div
              key={i}
              style={{ position: 'relative', zIndex: 1, cursor: 'pointer' }}
              onMouseEnter={() => setHoveredDot(i)}
              onMouseLeave={() => setHoveredDot(null)}
              onClick={() => window.scrollTo({ top: getSectionOffset(i), behavior: 'smooth' })}
            >
              {/* Tooltip to the left */}
              {hoveredDot === i && (
                <div style={{
                  position: 'absolute',
                  right: 'calc(100% + 10px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.85)',
                  color: '#fff',
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  letterSpacing: '0.02em',
                }}>
                  {beat.label}
                </div>
              )}
              {/* Dot — active state driven by RAF via navDotRefs */}
              <div
                ref={el => { navDotRefs.current[i] = el }}
                style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  transition: 'background 0.3s, border-color 0.3s',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>

      </div>

      {/* ── SCROLL SPACE: 280vh for city animation ── */}
      <div style={{ height: '280vh' }} />

      {/* ── LAYER 2: GRADIENT MASK — covers bottom of viewport up to building tops, fades during lift ── */}
      <div
        ref={gradientMaskRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '75vh',
          zIndex: 2,
          background: 'linear-gradient(to top, black 70%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── LAYER 1: PROSE — scrolls normally, visible above background, disappears behind buildings ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'linear-gradient(to bottom, transparent 0%, #000000 12%)',
        paddingTop: '0',
        paddingBottom: `${ALL_SENTENCES.length * 15}vh`,
        paddingLeft: '40px',
        paddingRight: '40px',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {ALL_SENTENCES.map((sentence, i) => (
            <FadeLine key={i} ref={i === 13 ? horizonRef : null}>{sentence}</FadeLine>
          ))}
        </div>
      </div>

      {/* ── UNDERGROUND SCROLL SECTION — scroll space only; drives undergroundProgress in RAF ── */}
      <div
        ref={undergroundRef}
        style={{
          position: 'relative', zIndex: 1,
          paddingTop: '0',
          paddingBottom: `${UNDERGROUND_SENTENCES.length * 20}vh`,
        }}
      />

      {/* ── UNDERGROUND SENTENCES — teleprompter roll, dead center, RAF-driven ── */}
      <div
        ref={undergroundTextContainerRef}
        style={{
          position: 'fixed', top: '30%', left: '50%',
          transform: 'translate(-50%, calc(-50% + 140px))',
          zIndex: 100, pointerEvents: 'none',
          textAlign: 'center', width: '90%', maxWidth: 640,
          opacity: 0,
        }}
      >
        {UNDERGROUND_SENTENCES.map((sentence, i) => (
          <div
            key={`ut-${i}`}
            ref={el => { undergroundTextRefs.current[i] = el }}
            style={{
              height: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(1rem, 2.2vw, 1.3rem)',
              lineHeight: 1.9,
              color: '#ffffff',
              opacity: 0,
            }}
          >
            {sentence}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(4px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(255,107,157,0.7), 0 0 14px rgba(255,107,157,0.3); }
          50% { box-shadow: 0 0 10px rgba(255,107,157,1), 0 0 24px rgba(255,107,157,0.6); }
        }
      `}</style>
    </div>
  )
}
