'use client'

import { useState, useEffect } from 'react'
import SiteHeader from '../_components/SiteHeader'
import SiteFooter from '../_components/SiteFooter'
import { useCurrency } from '../../lib/useCurrency'

const COVER = 'https://static.wixstatic.com/media/d449e2_fd8c48fe8b274b67be10d4773240837b~mv2.png'
const SINGLE_COPY_URL = 'https://www.theparlormagazine.com/product-page/vol-2-the-world-we-re-building'

export default function PrintIssuePage() {
  const [flipbookOpen, setFlipbookOpen] = useState(false)
  const { symbol } = useCurrency()
  useEffect(() => {
    if (!flipbookOpen) return
    const onKey = e => { if (e.key === 'Escape') setFlipbookOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipbookOpen])

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap');
        :root { --black:#0a0a0a; --white:#fff; --pink:#f2b8c6; --maroon:#7a2531; --muted:#b9b2ab; --grey:#d9d4cd; --border:#22201d; }
        .pi-hero { background:var(--black); display:grid; grid-template-columns:1fr 1fr; min-height:600px; }
        .pi-left { position:relative; overflow:hidden; background:linear-gradient(160deg,#f7d7e0,#f3c3d1); display:flex; align-items:center; justify-content:center; }
        .pi-left img { width:100%; height:100%; object-fit:contain; padding:44px; display:block; }
        .pi-look { position:absolute; left:50%; bottom:28px; transform:translateX(-50%); display:inline-flex; align-items:center; gap:8px; background:#fff; color:#0a0a0a; border:none; border-radius:4px; padding:11px 20px; font-family:'Source Serif 4',Georgia,serif; font-size:14px; cursor:pointer; box-shadow:0 6px 20px rgba(0,0,0,0.2); transition:transform .15s; }
        .pi-look:hover { transform:translateX(-50%) scale(1.04); }
        .pi-right { padding:64px 56px; display:flex; flex-direction:column; justify-content:center; }
        .pi-eyebrow { font-family:'Source Serif 4',Georgia,serif; font-size:13px; letter-spacing:0.2em; text-transform:uppercase; color:var(--pink); margin-bottom:18px; }
        .pi-headline { font-family:'Playfair Display',Georgia,serif; font-size:clamp(30px,3.4vw,42px); font-weight:700; color:var(--white); line-height:1.08; margin:0 0 10px; }
        .pi-headline em { font-style:italic; color:var(--pink); }
        .pi-subhead { font-family:'Playfair Display',Georgia,serif; font-size:16px; font-style:italic; color:var(--muted); margin-bottom:22px; }
        .pi-body { font-size:16px; line-height:1.8; color:var(--grey); margin-bottom:28px; max-width:460px; font-family:'Source Serif 4',Georgia,serif; }
        .pi-cta-stack { display:flex; flex-direction:column; gap:11px; max-width:520px; }
        .pi-primary { background:var(--pink); color:var(--black); border:none; padding:15px 24px; font-family:'Playfair Display',Georgia,serif; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:16px; letter-spacing:0.02em; transition:background .15s; text-decoration:none; }
        .pi-primary:hover { background:var(--white); }
        .pi-secondary { background:transparent; color:var(--pink); border:1px solid var(--pink); padding:15px 24px; font-family:'Playfair Display',Georgia,serif; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:16px; letter-spacing:0.02em; transition:all .15s; text-decoration:none; }
        .pi-secondary:hover { background:var(--pink); color:var(--black); }
        .pi-price { font-family:'Source Serif 4',Georgia,serif; font-size:13px; font-weight:400; opacity:0.75; text-align:right; }
        .pi-note { font-size:13px; color:var(--muted); font-style:italic; margin-top:4px; font-family:'Source Serif 4',Georgia,serif; }
        /* flipbook */
        .fb-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:300; display:flex; align-items:center; justify-content:center; padding:32px; }
        .fb-modal { background:#fff; border-radius:10px; width:min(900px,94vw); height:min(80vh,720px); position:relative; overflow:hidden; }
        .fb-close { position:absolute; top:10px; right:14px; background:none; border:none; font-size:28px; color:#333; cursor:pointer; z-index:2; }
        .fb-body { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .fb-placeholder { font-family:'Playfair Display',Georgia,serif; font-size:18px; color:#999; }
        @media (max-width:900px){ .pi-hero{ grid-template-columns:1fr; } .pi-left{ min-height:320px; } .pi-right{ padding:40px 24px; } }
      `}</style>

      <SiteHeader />

      <section className="pi-hero">
        <div className="pi-left">
          <img src={COVER} alt="The World We’re Building — Issue 02 print edition" />
          <button className="pi-look" onClick={() => setFlipbookOpen(true)}><span>◎</span> Look inside</button>
        </div>
        <div className="pi-right">
          <div className="pi-eyebrow">Now in print</div>
          <h1 className="pi-headline">Hold the conversation<br />in <em>your hands.</em></h1>
          <div className="pi-subhead">The World we’re Building — Issue 02</div>
          <p className="pi-body">
            From Kantamanto’s secondhand clothing markets in Accra to Casa Pueblo’s grassroots energy sovereignty in Puerto Rico, from the ethics of community tourism, to the pull toward intentional communities and communal land — Vol. 2 traces the infrastructure of collective imagination across continents: not just the world we dream of, but the deliberate, often invisible work of building it.
            <br /><br />
            Featuring original essays, reporting, and art — 112 pages, bound in print.
          </p>
          <div className="pi-cta-stack">
            <a href="/plans" className="pi-primary">
              Subscribe to the print edition
              <span className="pi-price">{symbol}30 / every four months · triannual issues</span>
            </a>
            <a href={SINGLE_COPY_URL} target="_blank" rel="noopener noreferrer" className="pi-secondary">
              Buy a single copy
              <span className="pi-price">{symbol}35 + shipping</span>
            </a>
            <p className="pi-note">Print subscribers receive every issue automatically.</p>
          </div>
        </div>
      </section>

      <SiteFooter />

      {flipbookOpen && (
        <div className="fb-overlay" onClick={() => setFlipbookOpen(false)}>
          <div className="fb-modal" onClick={e => e.stopPropagation()}>
            <button className="fb-close" aria-label="Close" onClick={() => setFlipbookOpen(false)}>&times;</button>
            <div className="fb-body">
              {/* Flipbook embed goes here — paste the flipbook code/iframe inside this container. */}
              <div className="fb-placeholder">Flipbook coming soon</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
