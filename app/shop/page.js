'use client'

import { useState, useMemo, useEffect } from 'react'
import SiteFooter from '../_components/SiteFooter'
import { useCurrency, fmtPrice } from '../../lib/useCurrency'
import { useCart } from '../../lib/useCart'
import { useWishlist } from '../../lib/useWishlist'
import { openCart } from '../../lib/cartUI'

// Product variants (from Printify import) live in p.variants as
// [{ name, printify_variant_id, price, sku }]. Helpers to read them.
const variantsOf = p => (Array.isArray(p?.variants) ? p.variants : [])

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"
const BLACK = '#0a0a0a'
const PINK = '#f2b8c6'
const MAROON = '#7a2531'

// Storefront categories — these drive product filtering. "Home" in the nav is a
// link back to the main site, not a filter.
const FALLBACK_CATEGORIES = ['Limited Edition', 'Self Care', 'Tea & Rituals', 'Apparel & Accessories']

const qtyBtn = { width: 26, height: 26, borderRadius: '50%', border: '1px solid #ddd', background: '#fff', color: '#555', fontSize: 15, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

// Countries we ship to (must mirror SHIP_COUNTRIES in the checkout/shipping API).
const SHIP_COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['FR', 'France'], ['DE', 'Germany'], ['ES', 'Spain'], ['IT', 'Italy'], ['NL', 'Netherlands'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['BE', 'Belgium'], ['AT', 'Austria'], ['CH', 'Switzerland'], ['PT', 'Portugal'], ['MX', 'Mexico'], ['BR', 'Brazil'], ['JP', 'Japan']]

// Placeholder catalog. First iteration only — swap for a real products table
// later. `tint` gives each card a soft placeholder image block.
const PRODUCTS = [
  { id: 'issue-2', name: 'The Parlor — Vol. 2', variant: 'The World We’re Building', price: 35, category: 'Limited Edition', tint: '#f6cdd8', featured: true },
  { id: 'issue-1', name: 'The Parlor — Vol. 1', variant: 'Borderlands of Identity', price: 35, category: 'Limited Edition', tint: '#e7d5c4' },
  { id: 'print-set', name: 'Collector’s Print Set', variant: 'Set of 3', price: 38, category: 'Limited Edition', tint: '#dfe3ea' },
  { id: 'candle', name: 'Parlor Candle', variant: 'Fig & Smoke', price: 32, category: 'Self Care', tint: '#e8ded0' },
  { id: 'balm', name: 'Hand Balm', variant: 'Rosewater', price: 18, category: 'Self Care', tint: '#f4dfe6' },
  { id: 'silk', name: 'Silk Eye Pillow', variant: 'Lavender', price: 28, category: 'Self Care', tint: '#e4e7de' },
  { id: 'tea-black', name: 'House Black Tea', variant: '20 sachets', price: 16, category: 'Tea & Rituals', tint: '#e9d8c6' },
  { id: 'tea-herbal', name: 'Evening Herbal', variant: 'Caffeine-free', price: 16, category: 'Tea & Rituals', tint: '#dde6d6' },
  { id: 'mug', name: 'Parlor Mug', variant: 'Stoneware', price: 22, category: 'Tea & Rituals', tint: '#e6ddef' },
  { id: 'tote', name: 'Canvas Tote', variant: 'Natural', price: 26, category: 'Apparel & Accessories', tint: '#e7e2d6' },
  { id: 'tee', name: 'The Parlor Tee', variant: 'Vintage black', price: 34, category: 'Apparel & Accessories', tint: '#d9d9dd' },
  { id: 'pin', name: 'Enamel Pin', variant: 'Mascot', price: 12, category: 'Apparel & Accessories', tint: '#f6d3c9' },
]

// Same shopping-bag icon as the main site header, in opposite colors for the
// dark shop header (white bag, white count badge with dark text).
function BagIcon({ count }) {
  return (
    <div style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <span style={{ position: 'absolute', top: -2, right: -4, background: '#fff', color: BLACK, fontFamily: BODY, fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
    </div>
  )
}

export default function ShopPage() {
  const [cat, setCat] = useState('all')
  const { cart, add: cartAdd } = useCart() // shared localStorage cart
  const wish = useWishlist()
  const [scrolled, setScrolled] = useState(false)
  const [variantSel, setVariantSel] = useState({}) // productId → chosen printify_variant_id
  const [products, setProducts] = useState(PRODUCTS) // hardcoded list is the fallback until the catalogue loads
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const { symbol } = useCurrency() // same-numeral geo pricing: $7 → €7 → £7

  // Load the live catalogue from the admin-managed DB; keep the seed list if empty/offline.
  useEffect(() => {
    fetch('/api/shop/products')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.products) && d.products.length) setProducts(d.products) })
      .catch(() => {})
    fetch('/api/shop/categories')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.categories) && d.categories.length) setCategories(d.categories) })
      .catch(() => {})
  }, [])

  // Pre-filter the collection when arriving via a category link. (The cart drawer
  // itself — and its ?cart/?checkout/?wishlist/?ordered handling — is global.)
  useEffect(() => {
    try {
      const c = new URLSearchParams(window.location.search).get('cat')
      if (c) { setCat(c); setTimeout(() => document.getElementById('shop-collection')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) }
    } catch {}
  }, [])

  // Show the floating cart once the header cart scrolls out of view.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shown = useMemo(() => {
    if (cat === 'all') return products
    return products.filter(p => p.category === cat)
  }, [cat, products])

  // The variant a card currently has selected (defaults to the first).
  const chosenVariant = p => {
    const vs = variantsOf(p)
    if (!vs.length) return null
    return vs.find(v => String(v.printify_variant_id) === String(variantSel[p.id])) || vs[0]
  }
  const priceOf = p => { const v = chosenVariant(p); return v?.price != null ? Number(v.price) : Number(p.price || 0) }

  const add = p => { const v = chosenVariant(p); cartAdd(p.id, v?.printify_variant_id ?? null); openCart() }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&family=Alex+Brush&display=swap');
        body { margin: 0; }
        .shop-navbar { position:sticky; top:0; z-index:50; background:${BLACK}; box-shadow:0 6px 20px rgba(0,0,0,0.18); }
        .shop-fab-cart { position:fixed; bottom:26px; right:26px; z-index:100; width:60px; height:60px; border-radius:50%; background:${BLACK}; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 28px rgba(0,0,0,0.32); opacity:0; transform:translateY(14px) scale(0.9); pointer-events:none; transition:opacity 0.25s ease, transform 0.25s cubic-bezier(.34,1.56,.64,1); }
        .shop-fab-cart.show { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
        .shop-fab-cart:hover { transform:translateY(0) scale(1.07); }
        @media (max-width:560px){ .shop-fab-cart { bottom:18px; right:18px; width:54px; height:54px; } }
        .shop-nav-link { background:none; border:none; cursor:pointer; color:#fff; font-family:${DISPLAY}; font-size:19px; letter-spacing:0.06em; padding:2px 0; position:relative; opacity:0.9; transition:opacity 0.15s; }
        .shop-nav-link:hover { opacity:1; }
        .shop-nav-link.active { opacity:1; }
        .shop-nav-link.active::after { content:''; position:absolute; left:0; right:0; bottom:-6px; height:2px; background:${PINK}; }
        .shop-browse { color:#fff; font-family:${BODY}; font-size:14px; letter-spacing:0.1em; text-transform:uppercase; background:none; border:none; cursor:pointer; padding:0; transition:color 0.15s; }
        .shop-browse:hover { color:${PINK}; }
        .shop-card { background:#fff; text-align:left; }
        .shop-card-img { border-radius:4px; aspect-ratio:4/5; display:flex; align-items:flex-end; justify-content:flex-start; padding:12px; }
        .shop-add { margin-top:10px; background:${BLACK}; color:#fff; border:none; border-radius:24px; padding:9px 20px; font-family:${BODY}; font-size:13px; letter-spacing:0.04em; cursor:pointer; transition:background 0.15s; }
        .shop-add:hover { background:${MAROON}; }
        .shop-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:34px 26px; }
        .shop-hero-title { font-family:${DISPLAY}; font-weight:700; font-size:60px; line-height:1.05; color:#1a1a1a; margin:0; }
        .shop-welcome { font-family:${DISPLAY}; font-weight:700; font-size:64px; line-height:1.03; color:#fff; margin:0; }
        @media (max-width: 1000px) {
          .shop-topgrid { grid-template-columns:1fr !important; }
          .shop-herogrid { grid-template-columns:1fr !important; }
          .shop-grid { grid-template-columns:repeat(2,1fr); }
          .shop-welcome { font-size:46px; }
          .shop-hero-title { font-size:42px; }
          .shop-nav-row { flex-wrap:wrap; gap:18px 24px !important; }
        }
        @media (max-width: 560px) { .shop-grid { grid-template-columns:1fr; } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ background: BLACK }}>
        <div className="shop-topgrid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 40, padding: '56px 48px 46px' }}>
          <h1 className="shop-welcome">Welcome<br />to The Parlor<br />Shop</h1>
          <div style={{ position: 'relative', paddingTop: 6 }}>
            <div style={{ position: 'absolute', top: -8, right: 0, cursor: 'pointer' }} onClick={openCart}><BagIcon count={cart.length} /></div>
            <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 21, color: '#fff', marginBottom: 14, maxWidth: 460 }}>
              Sip a tea. Light a Candle. Fund a revolution.
            </div>
            <p style={{ fontFamily: BODY, fontSize: 16.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', margin: '0 0 22px', maxWidth: 480 }}>
              The Parlor Shop is how we sustain the work. Limited print editions and curated goods that support reader-funded essays, community gatherings, and multi-media projects.
            </p>
            <div style={{ width: 96, height: 1, background: 'rgba(255,255,255,0.55)', marginBottom: 18 }} />
            <button className="shop-browse" onClick={() => { setCat('all'); document.getElementById('shop-collection')?.scrollIntoView({ behavior: 'smooth' }) }}>
              Browse the collection
            </button>
          </div>
        </div>

      </header>

      {/* Sticky category bar — stays pinned to the top as the hero above scrolls away */}
      <div className="shop-navbar">
        {/* pink double rule */}
        <div style={{ borderTop: `2px solid ${PINK}`, borderBottom: `2px solid ${PINK}`, height: 4, background: BLACK }} />

        {/* category nav */}
        <nav className="shop-nav-row" style={{ display: 'flex', justifyContent: 'center', gap: 46, padding: '20px 24px' }}>
          <a href="/" className="shop-nav-link" style={{ textDecoration: 'none' }}>Home</a>
          {categories.map(c => (
            <button key={c} className={`shop-nav-link${cat === c ? ' active' : ''}`} onClick={() => { setCat(c); document.getElementById('shop-collection')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{c}</button>
          ))}
        </nav>
      </div>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ background: '#e9e7e3' }}>
        <div className="shop-herogrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
          <div style={{ padding: '56px 48px' }}>
            <h2 className="shop-hero-title">Get our<br />Second Issue<br />in Print!</h2>
            <button
              onClick={() => { setCat('Limited Edition'); document.getElementById('shop-collection')?.scrollIntoView({ behavior: 'smooth' }) }}
              style={{ marginTop: 24, background: BLACK, color: '#fff', border: 'none', borderRadius: 26, padding: '12px 26px', fontFamily: BODY, fontSize: 14.5, letterSpacing: '0.04em', cursor: 'pointer' }}>
              Order Vol. 2 — $35
            </button>
          </div>
          {/* Vol. 2 print cover — same illustration used on the /print landing page. */}
          <div style={{ alignSelf: 'stretch', minHeight: 420, background: 'linear-gradient(160deg,#f7d7e0,#f3c3d1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
            <img
              src="https://static.wixstatic.com/media/d449e2_fd8c48fe8b274b67be10d4773240837b~mv2.png"
              alt="The Parlor — Vol. 2, The World We’re Building (print cover)"
              style={{ maxWidth: '100%', maxHeight: 400, width: 'auto', borderRadius: 6, boxShadow: '0 10px 34px rgba(0,0,0,0.18)', transform: 'rotate(-3deg)' }}
            />
          </div>
        </div>
      </section>

      {/* ── Collection ─────────────────────────────────────────── */}
      <section id="shop-collection" style={{ padding: '54px 48px 72px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 26 }}>
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, color: '#1a1a1a', margin: 0 }}>{cat === 'all' ? 'The collection' : cat}</h3>
          <span style={{ fontFamily: BODY, fontSize: 13, color: '#777' }}>{shown.length} item{shown.length === 1 ? '' : 's'}</span>
        </div>
        <div className="shop-grid">
          {shown.map(p => (
            <div key={p.id} className="shop-card" style={{ position: 'relative' }}>
              <button onClick={() => wish.toggle(p.id)} aria-label="Wishlist" title="Wishlist"
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: wish.has(p.id) ? '#c4364a' : '#555', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                {wish.has(p.id) ? '♥' : '♡'}
              </button>
              <a href={`/shop/${p.id}`} className="shop-card-img" style={{ display: 'block', backgroundColor: p.tint || '#eee', backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {!p.images?.[0] && <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, color: 'rgba(0,0,0,0.32)' }}>{p.category === 'Limited Edition' ? 'Limited' : ''}</span>}
              </a>
              <a href={`/shop/${p.id}`} style={{ fontFamily: DISPLAY, fontSize: 17, color: '#1a1a1a', marginTop: 12, textDecoration: 'none' }}>{p.name}</a>
              {p.variant && <div style={{ fontFamily: BODY, fontSize: 13, color: '#777', marginTop: 2 }}>{p.variant}</div>}
              {variantsOf(p).length > 1 && (
                <select
                  value={String(chosenVariant(p)?.printify_variant_id ?? '')}
                  onChange={e => setVariantSel(s => ({ ...s, [p.id]: e.target.value }))}
                  style={{ marginTop: 8, width: '100%', padding: '7px 9px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, color: '#333', background: '#fff', cursor: 'pointer' }}>
                  {variantsOf(p).map(v => <option key={v.printify_variant_id} value={String(v.printify_variant_id)}>{v.name || 'Option'}</option>)}
                </select>
              )}
              <div style={{ fontFamily: BODY, fontSize: 15, color: '#1a1a1a', marginTop: 6 }}>{fmtPrice(priceOf(p), symbol)}</div>
              <button className="shop-add" onClick={() => add(p)}>Add to cart</button>
            </div>
          ))}
        </div>
      </section>

      {/* Floating cart — appears once you scroll past the header cart */}
      <button
        className={`shop-fab-cart${scrolled ? ' show' : ''}`}
        aria-label={`Cart, ${cart.length} item${cart.length === 1 ? '' : 's'}`}
        onClick={openCart}>
        <BagIcon count={cart.length} />
      </button>

      <SiteFooter />
    </div>
  )
}
