'use client'

import { useState, useEffect } from 'react'
import { useCart } from '../../lib/useCart'
import { openCart } from '../../lib/cartUI'

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"
const BLACK = '#0a0a0a'
const PINK = '#f2b8c6'
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

// The Parlor Shop header/nav, shared across the storefront index and product
// pages so they match. On interior pages, cart/wishlist links jump back to /shop
// (which opens the drawer); category links pre-filter the collection.
export default function ShopHeader({ activeCat }) {
  const { cart } = useCart()
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  useEffect(() => {
    fetch('/api/shop/categories').then(r => r.json())
      .then(d => { if (Array.isArray(d.categories) && d.categories.length) setCategories(d.categories) })
      .catch(() => {})
  }, [])
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400&display=swap');
        .sh-navbar { position:sticky; top:0; z-index:50; background:${BLACK}; box-shadow:0 6px 20px rgba(0,0,0,0.18); }
        .sh-nav-row { display:flex; justify-content:center; align-items:center; gap:46px; padding:20px 24px; flex-wrap:wrap; }
        .sh-nav-link { background:none; border:none; cursor:pointer; color:#fff; font-family:${DISPLAY}; font-size:19px; letter-spacing:0.06em; padding:2px 0; position:relative; opacity:0.9; transition:opacity 0.15s; text-decoration:none; }
        .sh-nav-link:hover { opacity:1; }
        .sh-nav-link.active { opacity:1; }
        .sh-nav-link.active::after { content:''; position:absolute; left:0; right:0; bottom:-6px; height:2px; background:${PINK}; }
        @media (max-width:1000px){ .sh-nav-row { gap:18px 24px; } .sh-top { padding:16px 24px !important; } }
      `}</style>

      <header className="sh-top" style={{ background: BLACK, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 48px' }}>
        <a href="/shop" style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 26, color: '#fff', textDecoration: 'none' }}>The Parlor Shop</a>
        <a href="/shop?cart=1" aria-label="Cart" onClick={e => { e.preventDefault(); openCart() }} style={{ textDecoration: 'none', cursor: 'pointer' }}><BagIcon count={cart.length} /></a>
      </header>

      <div className="sh-navbar">
        <div style={{ borderTop: `2px solid ${PINK}`, borderBottom: `2px solid ${PINK}`, height: 4, background: BLACK }} />
        <nav className="sh-nav-row">
          <a href="/" className="sh-nav-link">Home</a>
          {categories.map(c => (
            <a key={c} href={`/shop?cat=${encodeURIComponent(c)}`} className={`sh-nav-link${activeCat === c ? ' active' : ''}`}>{c}</a>
          ))}
        </nav>
      </div>
    </>
  )
}
