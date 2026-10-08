'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useCart, uniqueLineCount } from '../../lib/useCart'
import { openCart } from '../../lib/cartUI'

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"
const BLACK = '#0a0a0a'
const PINK = '#f2b8c6'
const MAROON = '#7a2531'
const FALLBACK_CATEGORIES = ['Limited Edition', 'Self Care', 'Tea & Rituals', 'Apparel & Accessories']

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

// The Parlor Shop header, shared across the storefront index and product pages so
// they match exactly: the "← Home" link, the "Welcome to The Parlor Shop" block,
// and the sticky hamburger (Shop-by-category drawer) + search strip. On product
// pages the search / Browse / category actions route back to /shop (which does the
// live filtering); on the index those same controls filter in-page.
export default function ShopHeader({ activeCat }) {
  const { cart } = useCart()
  const cartLineCount = uniqueLineCount(cart)
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [products, setProducts] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const searchWrapRef = useRef(null)

  useEffect(() => {
    fetch('/api/shop/categories').then(r => r.json())
      .then(d => { if (Array.isArray(d.categories) && d.categories.length) setCategories(d.categories) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/shop/products').then(r => r.json())
      .then(d => { if (Array.isArray(d.products)) setProducts(d.products) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { setDrawerOpen(false); setSearchOpen(false) } }
    const onDown = e => { if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setSearchOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [])

  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return []
    return products.filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)).slice(0, 6)
  }, [q, products])

  const submit = e => { e.preventDefault(); const qv = query.trim(); window.location.href = qv ? `/shop?q=${encodeURIComponent(qv)}` : '/shop' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400&display=swap');
        .sh-back { display:inline-flex; align-items:center; gap:9px; color:rgba(255,255,255,0.78); font-family:${BODY}; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; text-decoration:none; padding:26px 48px 0; transition:color 0.15s; }
        .sh-back:hover { color:#fff; }
        .sh-back-arrow { transition:transform 0.18s ease; transform-origin:left center; }
        .sh-back:hover .sh-back-arrow { transform:translateX(-3px) scale(1.35); }
        .sh-welcome { font-family:${DISPLAY}; font-weight:700; font-size:64px; line-height:1.03; color:#fff; margin:0; }
        .sh-browse { color:#fff; font-family:${BODY}; font-size:14px; letter-spacing:0.1em; text-transform:uppercase; background:none; border:none; cursor:pointer; padding:0; text-decoration:none; transition:color 0.15s; }
        .sh-browse:hover { color:${PINK}; }
        .sh-navbar { position:sticky; top:0; z-index:50; background:${BLACK}; box-shadow:0 6px 20px rgba(0,0,0,0.18); }
        .sh-strip { display:flex; align-items:center; gap:16px; padding:13px 24px; max-width:1180px; margin:0 auto; }
        .sh-ham { flex:0 0 auto; display:flex; align-items:center; gap:9px; background:none; border:none; cursor:pointer; color:#fff; font-family:${BODY}; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; padding:8px 10px; border-radius:7px; transition:background 0.15s; }
        .sh-ham:hover { background:rgba(255,255,255,0.1); }
        .sh-search-wrap { position:relative; flex:1 1 auto; }
        .sh-search-input { width:100%; box-sizing:border-box; background:#fff; border:none; border-radius:30px; padding:12px 44px 12px 20px; font-family:${BODY}; font-size:15px; color:#1a1a1a; outline:none; }
        .sh-search-input::placeholder { color:#9a9a9a; }
        .sh-search-ico { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#6a6a6a; padding:0; display:flex; }
        .sh-search-panel { position:absolute; top:calc(100% + 10px); left:0; right:0; background:#fff; border-radius:12px; box-shadow:0 18px 50px rgba(0,0,0,0.26); overflow:hidden; z-index:60; }
        .sh-sr-head { font-family:${BODY}; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:#999; padding:14px 18px 6px; }
        .sh-sr-row { display:flex; align-items:center; gap:12px; padding:9px 18px; text-decoration:none; color:#1a1a1a; cursor:pointer; }
        .sh-sr-row:hover { background:#faf6f2; }
        .sh-sr-thumb { width:42px; height:52px; border-radius:4px; flex:0 0 auto; background-size:cover; background-position:center; background-color:#eee; }
        .sh-sr-name { font-family:${DISPLAY}; font-size:15px; line-height:1.2; }
        .sh-sr-price { font-family:${BODY}; font-size:13px; color:#777; }
        .sh-sr-chip { display:inline-block; font-family:${BODY}; font-size:13px; color:#333; background:#f1ece7; border:none; border-radius:16px; padding:7px 14px; margin:2px 6px 2px 0; cursor:pointer; }
        .sh-sr-chip:hover { background:${PINK}; }
        .sh-drawer-back { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:80; opacity:0; transition:opacity 0.25s; }
        .sh-drawer-back.show { opacity:1; }
        .sh-drawer { position:fixed; top:0; left:0; bottom:0; width:340px; max-width:86vw; background:#fff; z-index:81; box-shadow:12px 0 40px rgba(0,0,0,0.22); transform:translateX(-100%); transition:transform 0.28s cubic-bezier(.4,0,.2,1); display:flex; flex-direction:column; }
        .sh-drawer.show { transform:translateX(0); }
        .sh-drawer-top { display:flex; align-items:center; justify-content:space-between; padding:20px 22px; background:${BLACK}; color:#fff; }
        .sh-drawer-top h4 { margin:0; font-family:${DISPLAY}; font-weight:700; font-size:20px; }
        .sh-drawer-x { background:none; border:none; color:#fff; cursor:pointer; font-size:22px; line-height:1; padding:4px; }
        .sh-drawer-body { overflow-y:auto; padding:8px 0 24px; }
        .sh-drawer-item { display:block; width:100%; text-align:left; background:none; border:none; cursor:pointer; font-family:${DISPLAY}; font-size:18px; color:#1a1a1a; padding:13px 22px; text-decoration:none; transition:background 0.12s; }
        .sh-drawer-item:hover { background:#faf6f2; }
        .sh-drawer-item.active { color:${MAROON}; }
        @media (max-width:1000px){ .sh-topgrid { grid-template-columns:1fr !important; } .sh-welcome { font-size:46px; } .sh-ham-label { display:none; } }
      `}</style>

      {/* Header — identical welcome block to /shop */}
      <header style={{ background: BLACK }}>
        <a href="/" className="sh-back">
          <svg className="sh-back-arrow" width="22" height="16" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="27" y1="12" x2="3" y2="12" /><polyline points="10 19 3 12 10 5" />
          </svg>
          Home
        </a>
        <div className="sh-topgrid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 40, padding: '14px 48px 46px' }}>
          <a href="/shop" style={{ textDecoration: 'none' }}><h1 className="sh-welcome">Welcome<br />to The Parlor<br />Shop</h1></a>
          <div style={{ position: 'relative', paddingTop: 6 }}>
            <div style={{ position: 'absolute', top: -8, right: 0, cursor: 'pointer' }} onClick={openCart}><BagIcon count={cartLineCount} /></div>
            <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 21, color: '#fff', marginBottom: 14, maxWidth: 460 }}>
              Sip a tea. Light a Candle. Fund a revolution.
            </div>
            <p style={{ fontFamily: BODY, fontSize: 16.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', margin: '0 0 22px', maxWidth: 480 }}>
              The Parlor Shop is how we sustain the work. Limited print editions and curated goods that support reader-funded essays, community gatherings, and multi-media projects.
            </p>
            <div style={{ width: 96, height: 1, background: 'rgba(255,255,255,0.55)', marginBottom: 18 }} />
            <a href="/shop" className="sh-browse">Browse the collection</a>
          </div>
        </div>
      </header>

      {/* Sticky strip — hamburger (category drawer) + search */}
      <div className="sh-navbar">
        <div style={{ borderTop: `2px solid ${PINK}`, borderBottom: `2px solid ${PINK}`, height: 4, background: BLACK }} />
        <div className="sh-strip">
          <button className="sh-ham" onClick={() => setDrawerOpen(true)} aria-label="Filter by category">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="sh-ham-label">{activeCat || 'All'}</span>
          </button>
          <form className="sh-search-wrap" ref={searchWrapRef} onSubmit={submit}>
            <input
              ref={inputRef}
              className="sh-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search the shop…"
              aria-label="Search products"
            />
            <button type="submit" className="sh-search-ico" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            {searchOpen && (
              <div className="sh-search-panel">
                {q ? (
                  searchResults.length ? (
                    <>
                      <div className="sh-sr-head">Products</div>
                      {searchResults.map(p => (
                        <a key={p.id} href={`/shop/${p.id}`} className="sh-sr-row">
                          <span className="sh-sr-thumb" style={{ backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined }} />
                          <span>
                            <span className="sh-sr-name">{p.name}</span>
                          </span>
                        </a>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontFamily: BODY, fontSize: 14, color: '#555', marginBottom: 10 }}>No products match "{query.trim()}". Try a category:</div>
                      {categories.map(c => <button key={c} className="sh-sr-chip" onClick={() => { window.location.href = `/shop?cat=${encodeURIComponent(c)}` }}>{c}</button>)}
                    </div>
                  )
                ) : (
                  <div style={{ padding: '4px 0 12px' }}>
                    <div className="sh-sr-head">Browse by category</div>
                    <div style={{ padding: '6px 14px 2px' }}>
                      <button className="sh-sr-chip" onClick={() => { window.location.href = '/shop' }}>All products</button>
                      {categories.map(c => <button key={c} className="sh-sr-chip" onClick={() => { window.location.href = `/shop?cat=${encodeURIComponent(c)}` }}>{c}</button>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Shop-by-category drawer */}
      <div className={`sh-drawer-back${drawerOpen ? ' show' : ''}`} style={{ pointerEvents: drawerOpen ? 'auto' : 'none' }} onClick={() => setDrawerOpen(false)} aria-hidden={!drawerOpen} />
      <aside className={`sh-drawer${drawerOpen ? ' show' : ''}`} role="dialog" aria-label="Shop by category" aria-hidden={!drawerOpen}>
        <div className="sh-drawer-top">
          <h4>Shop by category</h4>
          <button className="sh-drawer-x" onClick={() => setDrawerOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="sh-drawer-body">
          <a className="sh-drawer-item" href="/shop">All products</a>
          {categories.map(c => (
            <a key={c} className={`sh-drawer-item${activeCat === c ? ' active' : ''}`} href={`/shop?cat=${encodeURIComponent(c)}`}>{c}</a>
          ))}
        </div>
      </aside>
    </>
  )
}
