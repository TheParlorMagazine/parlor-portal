'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import SiteFooter from '../_components/SiteFooter'
import { useCurrency, fmtPrice } from '../../lib/useCurrency'
import { useCart, uniqueLineCount } from '../../lib/useCart'
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

// Storefront categories — these drive product filtering. Fallback only; the live
// list comes from /api/shop/categories.
const FALLBACK_CATEGORIES = ['Limited Edition', 'Self Care', 'Tea & Rituals', 'Apparel & Accessories']

const qtyBtn = { width: 26, height: 26, borderRadius: '50%', border: '1px solid #ddd', background: '#fff', color: '#555', fontSize: 15, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

// Countries we ship to (must mirror SHIP_COUNTRIES in the checkout/shipping API).
const SHIP_COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['FR', 'France'], ['DE', 'Germany'], ['ES', 'Spain'], ['IT', 'Italy'], ['NL', 'Netherlands'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['BE', 'Belgium'], ['AT', 'Austria'], ['CH', 'Switzerland'], ['PT', 'Portugal'], ['MX', 'Mexico'], ['BR', 'Brazil'], ['JP', 'Japan']]

// Placeholder catalog. First iteration only — swapped for the real products table
// once /api/shop/products loads. `tint` gives each card a soft placeholder block.
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

// Scroll the collection grid to just below the pinned filter strip, so the
// "The collection" heading clears the sticky search bar instead of hiding under it.
function scrollToCollection() {
  if (typeof document === 'undefined') return
  const el = document.getElementById('shop-collection')
  if (!el) return
  const nav = document.querySelector('.shop-navbar')
  const top = el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight || 0) - 16
  window.scrollTo({ top, behavior: 'smooth' })
}

// Case-insensitive match of a product against a search query (name/variant/category).
function matchesQuery(p, q) {
  if (!q) return true
  return [p.name, p.variant, p.category].filter(Boolean).some(s => String(s).toLowerCase().includes(q))
}

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
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false) // search dropdown visible
  const [drawerOpen, setDrawerOpen] = useState(false) // left filter drawer
  const [sort, setSort] = useState('featured') // featured | price-asc | price-desc
  const { cart, add: cartAdd } = useCart() // shared localStorage cart
  const wish = useWishlist()
  const [scrolled, setScrolled] = useState(false)
  const [variantSel, setVariantSel] = useState({}) // productId → chosen printify_variant_id
  const [imgRatios, setImgRatios] = useState({}) // productId → primary image aspect ratio (w/h)
  const [products, setProducts] = useState(PRODUCTS) // hardcoded list is the fallback until the catalogue loads
  const [bundles, setBundles] = useState([])
  const [catalogueLoaded, setCatalogueLoaded] = useState(false)
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const { symbol } = useCurrency() // same-numeral geo pricing: $7 → €7 → £7
  const searchWrapRef = useRef(null)

  // Load the live catalogue from the admin-managed DB; keep the seed list if empty/offline.
  useEffect(() => {
    fetch('/api/shop/products')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.products) && d.products.length) setProducts(d.products) })
      .catch(() => {})
      .finally(() => setCatalogueLoaded(true))
    fetch('/api/shop/categories')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.categories) && d.categories.length) setCategories(d.categories) })
      .catch(() => {})
    fetch('/api/shop/bundles')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.bundles) && d.bundles.length) setBundles(d.bundles.map(b => ({ ...b, _isBundle: true }))) })
      .catch(() => {})
  }, [])

  // Merge products + bundles into one list for display (must be before effects that use it).
  const allItems = useMemo(() => [...products, ...bundles], [products, bundles])

  // Measure each product's primary image aspect ratio so wide/landscape images
  // (e.g. the 2-issue bundle shot, 16:9) are shown "contain" (fit, no crop) in the
  // 4/5 portrait card instead of being cropped to "cover". Browser cache makes
  // these loads free since the same images are rendered on the cards.
  useEffect(() => {
    let alive = true
    for (const p of allItems) {
      const src = p.images?.[0]
      if (!src || imgRatios[p.id] != null) continue
      const im = new Image()
      im.onload = () => { if (alive && im.naturalHeight) setImgRatios(r => (r[p.id] != null ? r : { ...r, [p.id]: im.naturalWidth / im.naturalHeight })) }
      im.src = src
    }
    return () => { alive = false }
  }, [allItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-filter/search the collection when arriving via a category or search link.
  // (The cart drawer — and its ?cart/?checkout/?wishlist/?ordered handling — is global.)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const c = sp.get('cat')
      const q = sp.get('q')
      if (c) setCat(c)
      if (q) setQuery(q)
      if (c || q) setTimeout(() => scrollToCollection(), 100)
    } catch {}
  }, [])

  // Show the floating cart once the header cart scrolls out of view.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the search dropdown on outside click / Escape; close the drawer on Escape.
  useEffect(() => {
    const onDown = e => { if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setSearchOpen(false) }
    const onKey = e => { if (e.key === 'Escape') { setSearchOpen(false); setDrawerOpen(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [])

  // Lock body scroll while the filter drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const q = query.trim().toLowerCase()

  // Quick preview results for the search dropdown (top 6 matches).
  const searchResults = useMemo(() => (q ? allItems.filter(p => matchesQuery(p, q)).slice(0, 6) : []), [q, allItems])

  const shown = useMemo(() => {
    let list = allItems
    if (cat !== 'all') list = list.filter(p => p.category === cat)
    if (q) list = list.filter(p => matchesQuery(p, q))
    if (sort === 'price-asc' || sort === 'price-desc') {
      list = [...list].sort((a, b) => (Number(a.price || 0) - Number(b.price || 0)) * (sort === 'price-asc' ? 1 : -1))
    }
    return list
  }, [cat, allItems, q, sort])

  // Per-category counts for the filter drawer.
  const catCount = c => allItems.filter(p => p.category === c).length

  const applyCat = c => {
    setCat(c)
    setDrawerOpen(false)
    setTimeout(() => scrollToCollection(), 60)
  }

  // The variant a card currently has selected (defaults to the first).
  const chosenVariant = p => {
    const vs = variantsOf(p)
    if (!vs.length) return null
    return vs.find(v => String(v.printify_variant_id) === String(variantSel[p.id])) || vs[0]
  }
  const priceOf = p => { if (p._isBundle) return Number(p.price || 0); const v = chosenVariant(p); return v?.price != null ? Number(v.price) : Number(p.price || 0) }

  const add = p => { if (p._isBundle) { cartAdd(p.id, null); openCart(); return } const v = chosenVariant(p); cartAdd(p.id, v?.printify_variant_id ?? null); openCart() }

  // Landscape images (wider than ~5:4) get cropped badly in the 4/5 portrait card,
  // so show them "contain" (whole image, centered). Portrait/square product shots
  // keep "cover" so they fill the card. Defaults to cover until measured.
  const fitOf = p => { const r = imgRatios[p.id]; return (r > 1.1 || (r != null && r < 0.78)) ? 'contain' : 'cover' }

  const heading = cat !== 'all' ? cat : (q ? `Results for “${query.trim()}”` : 'The collection')

  // The single featured product drives the storefront hero promo.
  const featured = useMemo(() => allItems.find(p => p.featured) || null, [allItems])
  const heroImgs = (featured?.images?.length ? featured.images : ['https://static.wixstatic.com/media/d449e2_fd8c48fe8b274b67be10d4773240837b~mv2.png'])
  const heroHeadline = (featured?.featured_blurb || featured?.name || '').trim()

  // Auto-cycling hero image carousel through all of the featured product's images.
  const [heroImgIdx, setHeroImgIdx] = useState(0)
  useEffect(() => { setHeroImgIdx(0) }, [featured?.id])
  useEffect(() => {
    if (heroImgs.length < 2) return
    const t = setInterval(() => setHeroImgIdx(i => (i + 1) % heroImgs.length), 4000)
    return () => clearInterval(t)
  }, [featured?.id, heroImgs.length])

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
        .shop-browse { color:#fff; font-family:${BODY}; font-size:14px; letter-spacing:0.1em; text-transform:uppercase; background:none; border:none; cursor:pointer; padding:0; transition:color 0.15s; }
        .shop-browse:hover { color:${PINK}; }
        .shop-card { background:#fff; text-align:left; }
        .shop-card-img { position:relative; border-radius:4px; aspect-ratio:4/5; display:flex; align-items:flex-end; justify-content:flex-start; padding:12px; overflow:hidden; }
        .shop-add { margin-top:10px; background:${BLACK}; color:#fff; border:none; border-radius:24px; padding:9px 20px; font-family:${BODY}; font-size:13px; letter-spacing:0.04em; cursor:pointer; transition:background 0.15s; }
        .shop-add:hover { background:${MAROON}; }
        .shop-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:34px 26px; }
        .shop-hero-title { font-family:${DISPLAY}; font-weight:700; font-size:60px; line-height:1.05; color:#1a1a1a; margin:0; }
        @keyframes heroSlideIn { from { opacity:0; transform:translateX(-48px); } to { opacity:1; transform:translateX(0); } }
        @keyframes heroSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .shop-hero-title { animation: heroSlideIn 0.65s cubic-bezier(.22,1,.36,1) both; }
        .shop-hero-btn { display:inline-block; margin-top:24px; background:${BLACK}; color:#fff; text-decoration:none; border:2px solid ${BLACK}; border-radius:26px; padding:12px 26px; font-family:${BODY}; font-size:14.5px; letter-spacing:0.04em; cursor:pointer; animation:heroSlideUp 0.55s 0.45s cubic-bezier(.22,1,.36,1) both; transition:background 0.2s, color 0.2s; }
        .shop-hero-btn:hover { background:${MAROON}; border-color:${MAROON}; }
        .shop-welcome { font-family:${DISPLAY}; font-weight:700; font-size:64px; line-height:1.03; color:#fff; margin:0; }
        .shop-back { display:inline-flex; align-items:center; gap:9px; color:rgba(255,255,255,0.78); font-family:${BODY}; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; text-decoration:none; padding:26px 48px 0; transition:color 0.15s; }
        .shop-back:hover { color:#fff; }
        .shop-back-arrow { transition:transform 0.18s ease; transform-origin:left center; }
        .shop-back:hover .shop-back-arrow { transform:translateX(-3px) scale(1.35); }
        .shop-hero-left { padding: 56px 48px 64px 96px; }
        .shop-hero-figwrap { position:absolute; inset:0; width:100%; height:100%; display:block; }
        .shop-hero-figimg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 25%; transition:opacity 0.8s ease; }

        /* ── Filter strip (hamburger + search) ── */
        .shop-filterstrip { display:flex; align-items:center; gap:16px; padding:13px 24px; max-width:1180px; margin:0 auto; }
        .shop-ham { flex:0 0 auto; display:flex; align-items:center; gap:9px; background:none; border:none; cursor:pointer; color:#fff; font-family:${BODY}; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; padding:8px 10px; border-radius:7px; transition:background 0.15s; }
        .shop-ham:hover { background:rgba(255,255,255,0.1); }
        .shop-ham-label { opacity:0.92; }
        .shop-search-wrap { position:relative; flex:1 1 auto; }
        .shop-search-input { width:100%; box-sizing:border-box; background:#fff; border:none; border-radius:30px; padding:12px 44px 12px 20px; font-family:${BODY}; font-size:15px; color:#1a1a1a; outline:none; }
        .shop-search-input::placeholder { color:#9a9a9a; }
        .shop-search-ico { position:absolute; right:16px; top:50%; transform:translateY(-50%); pointer-events:none; color:#6a6a6a; }
        .shop-search-panel { position:absolute; top:calc(100% + 10px); left:0; right:0; background:#fff; border-radius:12px; box-shadow:0 18px 50px rgba(0,0,0,0.26); overflow:hidden; z-index:60; }
        .shop-sr-head { font-family:${BODY}; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:#999; padding:14px 18px 6px; }
        .shop-sr-row { display:flex; align-items:center; gap:12px; padding:9px 18px; text-decoration:none; color:#1a1a1a; cursor:pointer; }
        .shop-sr-row:hover { background:#faf6f2; }
        .shop-sr-thumb { width:42px; height:52px; border-radius:4px; flex:0 0 auto; background-size:cover; background-position:center; }
        .shop-sr-name { font-family:${DISPLAY}; font-size:15px; line-height:1.2; }
        .shop-sr-price { font-family:${BODY}; font-size:13px; color:#777; }
        .shop-sr-chip { display:inline-block; font-family:${BODY}; font-size:13px; color:#333; background:#f1ece7; border:none; border-radius:16px; padding:7px 14px; margin:2px 6px 2px 0; cursor:pointer; }
        .shop-sr-chip:hover { background:${PINK}; }

        /* ── Category chip on card ── */
        .shop-cat-chip { position:absolute; top:10px; left:10px; z-index:2; font-family:${BODY}; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#1a1a1a; background:rgba(255,255,255,0.92); border:none; border-radius:16px; padding:5px 11px; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.1); transition:background 0.15s; }
        .shop-cat-chip:hover { background:${PINK}; }

        /* ── Left filter drawer ── */
        .shop-drawer-back { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:80; opacity:0; transition:opacity 0.25s; }
        .shop-drawer-back.show { opacity:1; }
        .shop-drawer { position:fixed; top:0; left:0; bottom:0; width:340px; max-width:86vw; background:#fff; z-index:81; box-shadow:12px 0 40px rgba(0,0,0,0.22); transform:translateX(-100%); transition:transform 0.28s cubic-bezier(.4,0,.2,1); display:flex; flex-direction:column; }
        .shop-drawer.show { transform:translateX(0); }
        .shop-drawer-top { display:flex; align-items:center; justify-content:space-between; padding:20px 22px; background:${BLACK}; color:#fff; }
        .shop-drawer-top h4 { margin:0; font-family:${DISPLAY}; font-weight:700; font-size:20px; }
        .shop-drawer-x { background:none; border:none; color:#fff; cursor:pointer; font-size:22px; line-height:1; padding:4px; }
        .shop-drawer-body { overflow-y:auto; padding:8px 0 24px; }
        .shop-drawer-sec { font-family:${BODY}; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:#999; padding:18px 22px 6px; }
        .shop-drawer-item { display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; background:none; border:none; cursor:pointer; font-family:${DISPLAY}; font-size:18px; color:#1a1a1a; padding:13px 22px; transition:background 0.12s; }
        .shop-drawer-item:hover { background:#faf6f2; }
        .shop-drawer-item.active { color:${MAROON}; }
        .shop-drawer-item .count { font-family:${BODY}; font-size:13px; color:#aaa; }
        .shop-sort-row { display:flex; gap:8px; flex-wrap:wrap; padding:6px 22px 2px; }
        .shop-sort-btn { font-family:${BODY}; font-size:13px; color:#444; background:#f1ece7; border:none; border-radius:16px; padding:8px 14px; cursor:pointer; }
        .shop-sort-btn.active { background:${BLACK}; color:#fff; }

        @media (max-width: 1000px) {
          .shop-topgrid { grid-template-columns:1fr !important; }
          .shop-herogrid { grid-template-columns:1fr !important; }
          .shop-grid { grid-template-columns:repeat(2,1fr); }
          .shop-welcome { font-size:46px; }
          .shop-hero-title { font-size:42px; }
          .shop-hero-left { padding:48px 32px; }
        }
        @media (max-width: 560px) { .shop-grid { grid-template-columns:1fr; } .shop-ham-label { display:none; } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ background: BLACK }}>
        <a href="/" className="shop-back">
          <svg className="shop-back-arrow" width="22" height="16" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="27" y1="12" x2="3" y2="12" /><polyline points="10 19 3 12 10 5" />
          </svg>
          Home
        </a>
        <div className="shop-topgrid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 40, padding: '14px 48px 46px' }}>
          <h1 className="shop-welcome">Welcome<br />to The Parlor<br />Shop</h1>
          <div style={{ position: 'relative', paddingTop: 6 }}>
            <div style={{ position: 'absolute', top: -8, right: 0, cursor: 'pointer' }} onClick={openCart}><BagIcon count={uniqueLineCount(cart)} /></div>
            <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 21, color: '#fff', marginBottom: 14, maxWidth: 460 }}>
              Sip a tea. Light a Candle. Fund a revolution.
            </div>
            <p style={{ fontFamily: BODY, fontSize: 16.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', margin: '0 0 22px', maxWidth: 480 }}>
              The Parlor Shop is how we sustain the work. Limited print editions and curated goods that support reader-funded essays, community gatherings, and multi-media projects.
            </p>
            <div style={{ width: 96, height: 1, background: 'rgba(255,255,255,0.55)', marginBottom: 18 }} />
            <button className="shop-browse" onClick={() => { setCat('all'); setQuery(''); scrollToCollection() }}>
              Browse the collection
            </button>
          </div>
        </div>
      </header>

      {/* Sticky filter strip — hamburger (category drawer) + live search. Pins to the
          top as the hero scrolls away. */}
      <div className="shop-navbar">
        <div style={{ borderTop: `2px solid ${PINK}`, borderBottom: `2px solid ${PINK}`, height: 4, background: BLACK }} />
        <div className="shop-filterstrip">
          <button className="shop-ham" onClick={() => setDrawerOpen(true)} aria-label="Filter by category">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="shop-ham-label">{cat === 'all' ? 'All' : cat}</span>
          </button>
          <div className="shop-search-wrap" ref={searchWrapRef}>
            <input
              className="shop-search-input"
              value={query}
              onChange={e => { const v = e.target.value; setQuery(v); setSearchOpen(true); if (v.trim()) setCat('all') }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearchOpen(false); scrollToCollection() } }}
              placeholder="Search the shop…"
              aria-label="Search products"
            />
            <span className="shop-search-ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            {searchOpen && (
              <div className="shop-search-panel">
                {q ? (
                  searchResults.length ? (
                    <>
                      <div className="shop-sr-head">Products</div>
                      {searchResults.map(p => (
                        <a key={p.id} href={`/shop/${p.id}`} className="shop-sr-row">
                          <span className="shop-sr-thumb" style={{ backgroundColor: p.tint || '#eee', backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined }} />
                          <span>
                            <span className="shop-sr-name">{p.name}</span>
                            <span className="shop-sr-price" style={{ display: 'block', marginTop: 2 }}>{fmtPrice(priceOf(p), symbol)}</span>
                          </span>
                        </a>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontFamily: BODY, fontSize: 14, color: '#555', marginBottom: 10 }}>No products match “{query.trim()}”. Try a category:</div>
                      {categories.map(c => <button key={c} className="shop-sr-chip" onClick={() => { setQuery(''); setSearchOpen(false); applyCat(c) }}>{c}</button>)}
                    </div>
                  )
                ) : (
                  <div style={{ padding: '4px 0 12px' }}>
                    <div className="shop-sr-head">Browse by category</div>
                    <div style={{ padding: '6px 14px 2px' }}>
                      <button className="shop-sr-chip" onClick={() => { setSearchOpen(false); applyCat('all') }}>All products</button>
                      {categories.map(c => <button key={c} className="shop-sr-chip" onClick={() => { setSearchOpen(false); applyCat(c) }}>{c}</button>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Featured hero ──────────────────────────────────────── */}
      {/* Driven by the single product flagged "featured" in the admin (Shop →
          Products). The headline is that product's hero blurb; the image is its
          primary image; the button links to its page. Hidden when nothing is
          featured. */}
      {catalogueLoaded && featured && (
      <section style={{ background: '#f3c3d1' }}>
        <div className="shop-herogrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', alignItems: 'center' }}>
          <div className="shop-hero-left">
            <h2 className="shop-hero-title" style={{ whiteSpace: 'pre-line' }}>{heroHeadline}</h2>
            <a href={`/shop/${featured.id}`} className="shop-hero-btn">
              Order now — {fmtPrice(priceOf(featured), symbol)} plus shipping
            </a>
          </div>
          <div style={{ position: 'relative', alignSelf: 'stretch', minHeight: 440, overflow: 'hidden', background: '#e9e7e3' }}>
            <a href={`/shop/${featured.id}`} className="shop-hero-figwrap" aria-label={featured.name || 'Featured product'}>
              {heroImgs.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={i === heroImgIdx ? (featured.name || 'Featured product') : ''}
                  className="shop-hero-figimg"
                  style={{ opacity: i === heroImgIdx ? 1 : 0 }}
                  aria-hidden={i !== heroImgIdx}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              ))}
            </a>
          </div>
        </div>
      </section>
      )}

      {/* ── Collection ─────────────────────────────────────────── */}
      <section id="shop-collection" style={{ padding: '54px 48px 72px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 26, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, color: '#1a1a1a', margin: 0 }}>{heading}</h3>
            {(cat !== 'all' || q) && (
              <button onClick={() => { setCat('all'); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: BODY, fontSize: 13, color: MAROON, textDecoration: 'underline' }}>Clear</button>
            )}
          </div>
          <span style={{ fontFamily: BODY, fontSize: 13, color: '#777' }}>{shown.length} item{shown.length === 1 ? '' : 's'}</span>
        </div>
        {shown.length === 0 ? (
          <div style={{ fontFamily: BODY, fontSize: 16, color: '#777', padding: '40px 0' }}>Nothing here yet. <button onClick={() => { setCat('all'); setQuery('') }} style={{ background: 'none', border: 'none', color: MAROON, textDecoration: 'underline', cursor: 'pointer', fontFamily: BODY, fontSize: 16 }}>View all products</button>.</div>
        ) : (
        <div className="shop-grid">
          {shown.map(p => (
            <div key={p.id} className="shop-card" style={{ position: 'relative' }}>
              <button onClick={() => wish.toggle(p.id)} aria-label="Wishlist" title="Wishlist"
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: wish.has(p.id) ? '#c4364a' : '#555', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                {wish.has(p.id) ? '♥' : '♡'}
              </button>
              <a href={`/shop/${p.id}`} className="shop-card-img" style={{ display: 'flex', backgroundColor: fitOf(p) === 'contain' ? '#fff' : (p.tint || '#eee'), backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined, backgroundSize: fitOf(p) === 'contain' ? '116%' : 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                {p._isBundle ? (
                  <span className="shop-cat-chip" style={{ background: '#f2b8c6', color: '#7a2531' }}>Bundle</span>
                ) : p.category ? (
                  <span className="shop-cat-chip" role="button" tabIndex={0}
                    onClick={e => { e.preventDefault(); applyCat(p.category) }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyCat(p.category) } }}>
                    {p.category}
                  </span>
                ) : null}
              </a>
              <a href={`/shop/${p.id}`} style={{ fontFamily: DISPLAY, fontSize: 17, color: '#1a1a1a', marginTop: 12, textDecoration: 'none', display: 'block' }}>{p.name}</a>
              {p._isBundle ? (
                <div style={{ fontFamily: BODY, fontSize: 13, color: '#777', marginTop: 2 }}>{p.description || 'Curated bundle'}</div>
              ) : (
                <>
                  {p.variant && <div style={{ fontFamily: BODY, fontSize: 13, color: '#777', marginTop: 2 }}>{p.variant}</div>}
                  {variantsOf(p).length > 1 && (
                    <select
                      value={String(chosenVariant(p)?.printify_variant_id ?? '')}
                      onChange={e => setVariantSel(s => ({ ...s, [p.id]: e.target.value }))}
                      style={{ marginTop: 8, width: '100%', padding: '7px 9px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, color: '#333', background: '#fff', cursor: 'pointer' }}>
                      {variantsOf(p).map(v => <option key={v.printify_variant_id} value={String(v.printify_variant_id)}>{v.name || 'Option'}</option>)}
                    </select>
                  )}
                </>
              )}
              <div style={{ fontFamily: BODY, fontSize: 15, color: '#1a1a1a', marginTop: 6 }}>{fmtPrice(priceOf(p), symbol)}</div>
              <button className="shop-add" onClick={() => p.bundle_config ? (window.location.href = `/shop/${p.id}`) : add(p)}>
                {p.bundle_config ? 'Pick your items' : 'Add to cart'}
              </button>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* ── Left filter drawer (Shop by category) ── */}
      <div className={`shop-drawer-back${drawerOpen ? ' show' : ''}`} style={{ pointerEvents: drawerOpen ? 'auto' : 'none' }} onClick={() => setDrawerOpen(false)} aria-hidden={!drawerOpen} />
      <aside className={`shop-drawer${drawerOpen ? ' show' : ''}`} role="dialog" aria-label="Shop by category" aria-hidden={!drawerOpen}>
        <div className="shop-drawer-top">
          <h4>Shop by category</h4>
          <button className="shop-drawer-x" onClick={() => setDrawerOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="shop-drawer-body">
          <button className={`shop-drawer-item${cat === 'all' ? ' active' : ''}`} onClick={() => applyCat('all')}>
            <span>All products</span><span className="count">{products.length}</span>
          </button>
          {categories.map(c => (
            <button key={c} className={`shop-drawer-item${cat === c ? ' active' : ''}`} onClick={() => applyCat(c)}>
              <span>{c}</span><span className="count">{catCount(c)}</span>
            </button>
          ))}
          <div className="shop-drawer-sec">Sort by</div>
          <div className="shop-sort-row">
            {[['featured', 'Featured'], ['price-asc', 'Price ↑'], ['price-desc', 'Price ↓']].map(([val, label]) => (
              <button key={val} className={`shop-sort-btn${sort === val ? ' active' : ''}`} onClick={() => setSort(val)}>{label}</button>
            ))}
          </div>
        </div>
      </aside>

      {/* Floating cart — appears once you scroll past the header cart */}
      <button
        className={`shop-fab-cart${scrolled ? ' show' : ''}`}
        aria-label={`Cart, ${uniqueLineCount(cart)} item${uniqueLineCount(cart) === 1 ? '' : 's'}`}
        onClick={openCart}>
        <BagIcon count={uniqueLineCount(cart)} />
      </button>

      <SiteFooter />
    </div>
  )
}
