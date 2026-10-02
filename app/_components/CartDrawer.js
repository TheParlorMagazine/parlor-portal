'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '../../lib/supabase'
import { useCart, lineKey } from '../../lib/useCart'
import { useWishlist } from '../../lib/useWishlist'
import { useCurrency, fmtPrice } from '../../lib/useCurrency'

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"
const BLACK = '#0a0a0a'

const variantsOf = p => (Array.isArray(p?.variants) ? p.variants : [])
const qtyBtn = { width: 26, height: 26, borderRadius: '50%', border: '1px solid #ddd', background: '#fff', color: '#555', fontSize: 15, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const SHIP_COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['FR', 'France'], ['DE', 'Germany'], ['ES', 'Spain'], ['IT', 'Italy'], ['NL', 'Netherlands'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['BE', 'Belgium'], ['AT', 'Austria'], ['CH', 'Switzerland'], ['PT', 'Portugal'], ['MX', 'Mexico'], ['BR', 'Brazil'], ['JP', 'Japan']]

// Global shop cart drawer. Mounted once (root layout); opens in place over any
// page when a cart icon dispatches 'parlor-cart-open'. Holds the cart + wishlist
// tabs, live shipping, and account-gated checkout with auto-resume after auth.
export default function CartDrawer() {
  const { cart, add: cartAdd, dec, removeAll, clear } = useCart()
  const wish = useWishlist()
  const { symbol, country: geoCountry } = useCurrency()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('cart')
  const [products, setProducts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [user, setUser] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [resume, setResume] = useState(false)
  const [shipCountry, setShipCountry] = useState('')
  const [shipping, setShipping] = useState(null)
  const [shipLoading, setShipLoading] = useState(false)
  const effCountry = shipCountry || geoCountry || 'US'

  // Auth (orders tie to the member).
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data?.user || null)).catch(() => {})
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null))
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  // Lazily load the catalogue the first time the drawer is needed.
  function ensureProducts() {
    if (loaded) return
    setLoaded(true)
    fetch('/api/shop/products').then(r => r.json())
      .then(d => { if (Array.isArray(d.products)) setProducts(d.products) })
      .catch(() => {})
  }

  // Open via event from any cart icon.
  useEffect(() => {
    const onOpen = e => { ensureProducts(); setTab(e.detail?.tab === 'wishlist' ? 'wishlist' : 'cart'); setOpen(true) }
    window.addEventListener('parlor-cart-open', onOpen)
    return () => window.removeEventListener('parlor-cart-open', onOpen)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // URL params: open cart/wishlist, resume checkout after auth, clear on success.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      if (q.get('ordered') === '1') { clear(); window.history.replaceState({}, '', window.location.pathname) }
      if (q.get('cart') === '1') { ensureProducts(); setOpen(true) }
      if (q.get('wishlist') === '1') { ensureProducts(); setTab('wishlist'); setOpen(true) }
      if (q.get('checkout') === '1') { ensureProducts(); setOpen(true); setResume(true) }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cartGroups = useMemo(() => {
    const m = new Map()
    cart.forEach(({ id, vid }) => { const k = lineKey(id, vid); const g = m.get(k) || { id, vid, qty: 0 }; g.qty++; m.set(k, g) })
    return [...m.values()].map(({ id, vid, qty }) => {
      const product = products.find(p => String(p.id) === String(id))
      if (!product) return null
      const variant = vid != null ? variantsOf(product).find(v => String(v.printify_variant_id) === String(vid)) : null
      const unit = variant?.price != null ? Number(variant.price) : Number(product.price || 0)
      return { key: lineKey(id, vid), product, variant, qty, unit }
    }).filter(Boolean)
  }, [cart, products])
  const cartTotal = cartGroups.reduce((s, g) => s + g.unit * g.qty, 0)
  const wishItems = useMemo(() => products.filter(p => wish.ids.includes(p.id)), [products, wish.ids])

  const addLine = (product, variant) => cartAdd(product.id, variant?.printify_variant_id ?? null)
  const moveToCart = p => { const v = variantsOf(p)[0]; cartAdd(p.id, v?.printify_variant_id ?? null); setTab('cart') }

  // Live shipping quote.
  useEffect(() => {
    if (!open || !cartGroups.length) { setShipping(null); return }
    let alive = true; setShipLoading(true)
    fetch('/api/shop/shipping', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartGroups.map(g => ({ id: g.product.id, qty: g.qty, printify_variant_id: g.variant?.printify_variant_id ?? null })), country: effCountry }),
    }).then(r => r.json()).then(d => { if (alive) { setShipping(d); setShipLoading(false) } }).catch(() => { if (alive) setShipLoading(false) })
    return () => { alive = false }
  }, [open, cart, effCountry]) // eslint-disable-line react-hooks/exhaustive-deps

  async function checkout() {
    if (!cartGroups.length || checkingOut) return
    if (!user) { window.location.href = '/signup?returnTo=' + encodeURIComponent('/shop?checkout=1'); return }
    setCheckingOut(true)
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartGroups.map(g => ({ id: g.product.id, qty: g.qty, printify_variant_id: g.variant?.printify_variant_id ?? null })),
          country: effCountry, userId: user.id,
          successUrl: window.location.origin + '/shop/order-confirmed?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.href,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.url) { window.location.href = j.url; return }
      alert(j.error || 'Checkout is unavailable right now.')
    } catch { alert('Checkout failed. Please try again.') }
    finally { setCheckingOut(false) }
  }

  // Resume checkout automatically after returning from auth with ?checkout=1.
  useEffect(() => {
    if (resume && user && cartGroups.length && !checkingOut) {
      setResume(false)
      try { window.history.replaceState({}, '', window.location.pathname) } catch {}
      checkout()
    }
  }, [resume, user, cartGroups, checkingOut]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10050, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 92vw)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', padding: '0 22px' }}>
          <button onClick={() => setTab('cart')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: tab === 'cart' ? '#1a1a1a' : '#aaa', padding: '20px 0', borderBottom: tab === 'cart' ? '2px solid #1a1a1a' : '2px solid transparent', marginBottom: -1 }}>
            Cart{cart.length ? ` (${cart.length})` : ''}
          </button>
          <button onClick={() => setTab('wishlist')} title="Wishlist" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, color: tab === 'wishlist' ? '#c4364a' : '#bbb', padding: '20px 0', marginLeft: 22, borderBottom: tab === 'wishlist' ? '2px solid #c4364a' : '2px solid transparent', marginBottom: -1 }}>
            {tab === 'wishlist' ? '♥' : '♡'}{wish.count ? ` ${wish.count}` : ''}
          </button>
          <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 24, color: '#999', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {tab === 'wishlist' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: wishItems.length ? '10px 22px' : '40px 22px' }}>
            {wishItems.length === 0 ? (
              <div style={{ color: '#999', fontFamily: BODY, textAlign: 'center', marginTop: 40 }}>Your wishlist is empty. Tap the ♡ on any product to save it.</div>
            ) : wishItems.map(p => {
              const unit = variantsOf(p)[0]?.price != null ? Number(variantsOf(p)[0].price) : Number(p.price || 0)
              return (
                <div key={p.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <a href={`/shop/${p.id}`} style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, backgroundColor: p.tint || '#eee', backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={`/shop/${p.id}`} style={{ display: 'block', fontFamily: DISPLAY, fontSize: 15, color: '#1a1a1a', textDecoration: 'none' }}>{p.name}</a>
                    <div style={{ fontFamily: BODY, fontSize: 13, color: '#888' }}>{fmtPrice(unit, symbol)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                      <button onClick={() => moveToCart(p)} style={{ background: BLACK, color: '#fff', border: 'none', borderRadius: 20, padding: '6px 14px', fontFamily: BODY, fontSize: 12.5, cursor: 'pointer' }}>Move to cart</button>
                      <button onClick={() => wish.remove(p.id)} style={{ background: 'none', border: 'none', color: '#b99', fontSize: 12.5, cursor: 'pointer', fontFamily: BODY }}>Remove</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: cartGroups.length ? '10px 22px' : '40px 22px' }}>
            {cartGroups.length === 0 ? (
              <div style={{ color: '#999', fontFamily: BODY, textAlign: 'center', marginTop: 40 }}>Your cart is empty.</div>
            ) : cartGroups.map(({ key, product: p, variant, qty, unit }) => (
              <div key={key} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, backgroundColor: p.tint || '#eee', backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 15, color: '#1a1a1a' }}>{p.name}</div>
                  {(variant?.name || p.variant) && <div style={{ fontFamily: BODY, fontSize: 12.5, color: '#888' }}>{variant?.name || p.variant}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <button onClick={() => dec(key)} style={qtyBtn}>−</button>
                    <span style={{ fontFamily: BODY, fontSize: 14, minWidth: 18, textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => addLine(p, variant)} style={qtyBtn}>+</button>
                    <button onClick={() => removeAll(key)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b99', fontSize: 12.5, cursor: 'pointer', fontFamily: BODY }}>Remove</button>
                  </div>
                </div>
                <div style={{ fontFamily: BODY, fontSize: 14, color: '#1a1a1a', flexShrink: 0 }}>{fmtPrice(unit * qty, symbol)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'cart' && cartGroups.length > 0 && (
          <div style={{ padding: '18px 22px', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: BODY, fontSize: 13, color: '#777' }}>Ship to</span>
              <select value={effCountry} onChange={e => setShipCountry(e.target.value)}
                style={{ flex: 1, maxWidth: 190, padding: '7px 9px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, color: '#333', background: '#fff', cursor: 'pointer' }}>
                {SHIP_COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 14, marginBottom: 4, color: '#555' }}>
              <span>Subtotal</span><span>{fmtPrice(cartTotal, symbol)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 14, marginBottom: 8, color: '#555' }}>
              <span>Shipping</span>
              <span>{shipLoading ? '…' : shipping ? (shipping.amount > 0 ? fmtPrice(shipping.amount, symbol) : 'Free') : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 16, fontWeight: 700, marginBottom: 14, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <span>Total</span><span>{fmtPrice(cartTotal + (shipping?.amount || 0), symbol)}</span>
            </div>
            <button onClick={checkout} disabled={checkingOut} style={{ width: '100%', background: BLACK, color: '#fff', border: 'none', borderRadius: 26, padding: '14px 0', fontFamily: BODY, fontSize: 15, letterSpacing: '0.03em', cursor: checkingOut ? 'default' : 'pointer', opacity: checkingOut ? 0.6 : 1 }}>
              {checkingOut ? 'Redirecting…' : user ? 'Checkout' : 'Sign in to check out'}
            </button>
            {!user && <div style={{ fontFamily: BODY, fontSize: 11.5, color: '#999', textAlign: 'center', marginTop: 8 }}>Create an account or sign in to complete your order and track it.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
