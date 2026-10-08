'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '../../lib/supabase'
import { useCart, lineKey, uniqueLineCount } from '../../lib/useCart'
import { useWishlist } from '../../lib/useWishlist'
import { useCurrency, fmtPrice } from '../../lib/useCurrency'
import { alertDialog } from '../../lib/confirmDialog'

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
  const [bundles, setBundles] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [user, setUser] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [resume, setResume] = useState(false)
  const [shipping, setShipping] = useState(null)
  const [shipLoading, setShipLoading] = useState(false)
  const [addr, setAddr] = useState({ name: '', line1: '', line2: '', city: '', state: '', zip: '', country: '' })
  const [addrOpen, setAddrOpen] = useState(true)
  const [addrError, setAddrError] = useState(false)
  const effCountry = addr.country || geoCountry || 'US'
  const setA = (k, v) => { setAddr(a => ({ ...a, [k]: v })); setAddrError(false) }

  // Auth (orders tie to the member).
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data?.user || null)).catch(() => {})
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null))
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  // Lazily load the catalogue + bundles the first time the drawer is needed.
  function ensureProducts() {
    if (loaded) return
    setLoaded(true)
    fetch('/api/shop/products').then(r => r.json())
      .then(d => { if (Array.isArray(d.products)) setProducts(d.products) })
      .catch(() => {})
    fetch('/api/shop/bundles').then(r => r.json())
      .then(d => { if (Array.isArray(d.bundles)) setBundles(d.bundles.map(b => ({ ...b, _isBundle: true }))) })
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
    cart.forEach(({ id, vid, meta }) => { const k = lineKey(id, vid, meta); const g = m.get(k) || { id, vid, meta, qty: 0 }; g.qty++; m.set(k, g) })
    return [...m.values()].map(({ id, vid, meta, qty }) => {
      const product = products.find(p => String(p.id) === String(id)) || bundles.find(b => String(b.id) === String(id))
      if (!product) return null
      const variant = (!product._isBundle && vid != null) ? variantsOf(product).find(v => String(v.printify_variant_id) === String(vid)) : null
      const baseUnit = variant?.price != null ? Number(variant.price) : Number(product.price || 0)
      const unit = meta?.single_pick_price != null ? Number(meta.single_pick_price) : (meta?.bundle_price != null ? Number(meta.bundle_price) : (meta?.bundle_unit_price != null ? Number(meta.bundle_unit_price) : baseUnit))
      return { key: lineKey(id, vid, meta), product, variant, meta, qty, unit }
    }).filter(Boolean)
  }, [cart, products, bundles])
  const cartTotal = cartGroups.reduce((s, g) => s + g.unit * g.qty, 0)

  // Group cart lines by print_provider_id (Printify) or '__manual__' (self-fulfilled).
  // Manual items all ship together from us via USPS; Printify items ship together
  // per-provider at the discounted additional-item rate.
  const providerGroups = useMemo(() => {
    const byKey = new Map()
    cartGroups.forEach(item => {
      const key = item.product.print_provider_id ?? '__manual__'
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(item)
    })
    return [...byKey.entries()].map(([pid, items]) => {
      const isManual = pid === '__manual__'
      const allIssues = isManual && items.every(i => i.product.category === 'Issues')
      const carrier = allIssues ? 'USPS Media Mail' : isManual ? 'USPS / FedEx' : null
      return { pid, items, shipsTogether: items.length > 1, isManual, carrier }
    })
  }, [cartGroups])
  const wishItems = useMemo(() => products.filter(p => wish.ids.includes(p.id)), [products, wish.ids])

  const FREE_SHIP_THRESHOLD = 100 // same-numeral: $100 / £100 / €100
  const manualSubtotal = useMemo(() =>
    cartGroups.filter(g => g.product.fulfillment !== 'printify' && g.product.fulfillment !== 'external')
      .reduce((s, g) => s + g.unit * g.qty, 0),
  [cartGroups])
  const manualShipFree = manualSubtotal >= FREE_SHIP_THRESHOLD
  const manualToFree = Math.max(0, +(FREE_SHIP_THRESHOLD - manualSubtotal).toFixed(2))
  const hasManualItems = cartGroups.some(g => g.product.fulfillment !== 'printify' && g.product.fulfillment !== 'external')

  // Suggest manual products not already in cart, cheapest first, that would help reach the threshold.
  const manualSuggestions = useMemo(() => {
    if (!hasManualItems || manualShipFree) return []
    const inCart = new Set(cartGroups.map(g => g.product.id))
    return products
      .filter(p => (p.fulfillment === 'manual' || (!p.fulfillment && !p.print_provider_id)) && !inCart.has(p.id) && p.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
  }, [products, cartGroups, hasManualItems, manualShipFree])

  const addLine = (product, variant) => cartAdd(product.id, variant?.printify_variant_id ?? null)
  const moveToCart = p => { const v = variantsOf(p)[0]; cartAdd(p.id, v?.printify_variant_id ?? null); setTab('cart') }

  // US-only validation: any product with ships_to === 'us_only' can't ship internationally.
  const hasUsOnly = cartGroups.some(g => g.product.ships_to === 'us_only')
  const usOnlyError = hasUsOnly && effCountry && effCountry !== 'US'
    ? 'One or more items in your cart only ship within the US.'
    : null

  // Live shipping quote.
  useEffect(() => {
    if (!open || !cartGroups.length) { setShipping(null); return }
    let alive = true; setShipLoading(true)
    fetch('/api/shop/shipping', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartGroups.map(g => ({ id: g.product.id, qty: g.qty, printify_variant_id: g.variant?.printify_variant_id ?? null, bundle_unit_price: g.meta?.bundle_unit_price ?? null, bundle_picks: g.meta?.bundle_picks ?? null, single_pick: g.meta?.single_pick ?? null })), country: effCountry, state: addr.state || '' }),
    }).then(r => r.json()).then(d => { if (alive) { setShipping(d); setShipLoading(false) } }).catch(() => { if (alive) setShipLoading(false) })
    return () => { alive = false }
  }, [open, cart, effCountry, addr.state]) // eslint-disable-line react-hooks/exhaustive-deps

  async function checkout() {
    if (!cartGroups.length || checkingOut) return
    if (usOnlyError) return
    if (!addr.line1.trim() || !addr.city.trim() || !addr.zip.trim() || !addr.country.trim()) { setAddrOpen(true); setAddrError(true); return }
    if (!user) { window.location.href = '/signup?returnTo=' + encodeURIComponent('/shop?checkout=1'); return }
    setCheckingOut(true)
    const addrPayload = addr.line1.trim() ? addr : null
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartGroups.map(g => ({ id: g.product.id, qty: g.qty, printify_variant_id: g.variant?.printify_variant_id ?? null, bundle_unit_price: g.meta?.bundle_unit_price ?? null, bundle_picks: g.meta?.bundle_picks ?? null, bundle_price: g.meta?.bundle_price ?? null, single_pick: g.meta?.single_pick ?? null, single_pick_price: g.meta?.single_pick_price ?? null })),
          country: effCountry, userId: user.id, address: addrPayload,
          successUrl: window.location.origin + '/shop/order-confirmed?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.href,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.url) { window.location.href = j.url; return }
      alertDialog(j.error || 'Checkout is unavailable right now.')
    } catch { alertDialog('Checkout failed. Please try again.') }
    finally { setCheckingOut(false) }
  }

  // Resume checkout automatically after returning from auth with ?checkout=1.
  useEffect(() => {
    if (resume && user && cartGroups.length && !checkingOut) {
      setResume(false)
      try { window.history.replaceState({}, '', window.location.pathname) } catch {}
      if (!addr.line1.trim() || !addr.city.trim() || !addr.zip.trim() || !addr.country.trim()) { setAddrOpen(true); setAddrError(true); return }
      checkout()
    }
  }, [resume, user, cartGroups, checkingOut]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10050, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 92vw)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', padding: '0 22px' }}>
          <button onClick={() => setTab('cart')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: tab === 'cart' ? '#1a1a1a' : '#aaa', padding: '20px 0', borderBottom: tab === 'cart' ? '2px solid #1a1a1a' : '2px solid transparent', marginBottom: -1 }}>
            Cart{uniqueLineCount(cart) ? ` (${uniqueLineCount(cart)})` : ''}
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
            ) : providerGroups.map(({ pid, items, shipsTogether, isManual, carrier }) => (
              <div key={pid}>
                {(shipsTogether || (isManual && carrier)) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '10px 0 4px', padding: '7px 10px', background: '#f0faf4', borderRadius: 8, border: '1px solid #c6e8d2' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    <span style={{ fontFamily: BODY, fontSize: 12.5, color: '#2d7a4f', fontWeight: 600 }}>
                      {shipsTogether ? `These ${items.length} items ship together` : 'Ships from us'}
                    </span>
                    {carrier && <span style={{ fontFamily: BODY, fontSize: 12, color: '#5a9e78' }}>· {carrier}</span>}
                    {!isManual && <span style={{ fontFamily: BODY, fontSize: 12, color: '#5a9e78' }}>— combined shipping below</span>}
                  </div>
                )}
                {items.map(({ key, product: p, variant, meta, qty, unit }) => (
                  <div key={key} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, backgroundColor: p.tint || '#eee', backgroundImage: (meta?.single_pick_image || p.images?.[0]) ? `url(${meta?.single_pick_image || p.images[0]})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: DISPLAY, fontSize: 15, color: '#1a1a1a' }}>{p.name}</span>
                        {(p._isBundle || meta?.bundle_picks) && <span style={{ fontSize: 10.5, background: '#f2b8c6', color: '#7a2531', borderRadius: 10, padding: '2px 7px', fontFamily: BODY, fontWeight: 600, letterSpacing: '0.04em', flexShrink: 0 }}>Bundle</span>}
                      </div>
                      {meta?.single_pick_name
                        ? <div style={{ fontFamily: BODY, fontSize: 12, color: '#888', marginTop: 2 }}>{meta.single_pick_name}</div>
                        : meta?.bundle_picks_names?.length
                          ? <div style={{ fontFamily: BODY, fontSize: 12, color: '#888', marginTop: 2 }}>{meta.bundle_picks_names.join(' · ')}</div>
                          : p._isBundle ? (p.description && <div style={{ fontFamily: BODY, fontSize: 12.5, color: '#888' }}>{p.description}</div>) : (variant?.name || p.variant) ? <div style={{ fontFamily: BODY, fontSize: 12.5, color: '#888' }}>{variant?.name || p.variant}</div> : null}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <button onClick={() => dec(key)} style={qtyBtn}>−</button>
                        <span style={{ fontFamily: BODY, fontSize: 14, minWidth: 18, textAlign: 'center' }}>{qty}</span>
                        <button onClick={() => p._isBundle ? cartAdd(p.id, null) : addLine(p, variant)} style={qtyBtn}>+</button>
                        <button onClick={() => removeAll(key)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b99', fontSize: 12.5, cursor: 'pointer', fontFamily: BODY }}>Remove</button>
                      </div>
                    </div>
                    <div style={{ fontFamily: BODY, fontSize: 14, color: '#1a1a1a', flexShrink: 0 }}>{fmtPrice(unit * qty, symbol)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'cart' && cartGroups.length > 0 && (
          <div style={{ padding: '18px 22px', borderTop: '1px solid #eee' }}>
            {/* Shipping address */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999' }}>Shipping address</div>
                <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={e => e.currentTarget.querySelector('[data-tip]').style.opacity = 1} onMouseLeave={e => e.currentTarget.querySelector('[data-tip]').style.opacity = 0}>
                  <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#e8e4e0', color: '#999', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', flexShrink: 0 }}>?</span>
                  <div data-tip style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', fontFamily: BODY, fontSize: 12, whiteSpace: 'nowrap', padding: '5px 10px', borderRadius: 6, pointerEvents: 'none', opacity: 0, transition: 'opacity 0.15s', zIndex: 200 }}>
                    Enter address to calculate shipping
                    <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: '#1a1a1a transparent transparent transparent' }} />
                  </div>
                </div>
              </div>
              <button onClick={() => setAddrOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: `1px solid ${addrError && !addr.line1.trim() ? '#e57373' : '#e0dbd8'}`, borderRadius: 8, padding: '9px 13px', cursor: 'pointer', fontFamily: BODY, fontSize: 13, color: '#555' }}>
                <span>{addr.line1.trim() ? `${addr.line1}${addr.city ? `, ${addr.city}` : ''}` : 'Enter shipping address…'}</span>
                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>{addrOpen ? '▲' : '▼'}</span>
              </button>
              {addrError && !addr.line1.trim() && (
                <div style={{ marginTop: 6, fontFamily: BODY, fontSize: 12, color: '#c0392b' }}>Please enter your shipping address to continue.</div>
              )}
              {addrOpen && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <input value={addr.name} onChange={e => setA('name', e.target.value)} placeholder="Full name" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, outline: 'none' }} />
                  <input value={addr.line1} onChange={e => setA('line1', e.target.value)} placeholder="Address line 1" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, outline: 'none' }} />
                  <input value={addr.line2} onChange={e => setA('line2', e.target.value)} placeholder="Address line 2 (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, outline: 'none' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 7 }}>
                    <input value={addr.city} onChange={e => setA('city', e.target.value)} placeholder="City" style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, outline: 'none' }} />
                    <input value={addr.zip} onChange={e => setA('zip', e.target.value)} placeholder="ZIP" style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    <input value={addr.state} onChange={e => setA('state', e.target.value)} placeholder="State / region" style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, outline: 'none' }} />
                    <select value={addr.country} onChange={e => setA('country', e.target.value)} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: BODY, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                      <option value="">Country…</option>
                      {SHIP_COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {usOnlyError && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: 8, fontFamily: BODY, fontSize: 13, color: '#c0392b' }}>
                  ⚠ {usOnlyError}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 14, marginBottom: 4, color: '#555' }}>
              <span>Subtotal</span><span>{fmtPrice(cartTotal, symbol)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 14, marginBottom: 8, color: '#555' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Shipping
                {!shipLoading && shipping?.printify && providerGroups.some(g => g.shipsTogether) && (
                  <span style={{ fontSize: 11, background: '#f0faf4', color: '#2d7a4f', border: '1px solid #c6e8d2', borderRadius: 10, padding: '1px 7px' }}>combined</span>
                )}
              </span>
              <span>{shipLoading ? '…' : shipping ? (shipping.amount > 0 ? fmtPrice(shipping.amount, symbol) : 'Free') : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 16, fontWeight: 700, marginBottom: 14, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <span>Total</span><span>{fmtPrice(cartTotal + (shipping?.amount || 0), symbol)}</span>
            </div>
            {/* Free shipping progress for self-fulfilled items */}
            {hasManualItems && (
              <div style={{ marginBottom: 14 }}>
                {manualShipFree ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f0faf4', border: '1px solid #c6e8d2', borderRadius: 8 }}>
                    <span style={{ fontSize: 14 }}>✓</span>
                    <span style={{ fontFamily: BODY, fontSize: 13, color: '#2d7a4f', fontWeight: 600 }}>Free shipping on your order!</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 12.5, color: '#777', marginBottom: 6 }}>
                      <span>Add <strong style={{ color: '#1a1a1a' }}>{symbol}{manualToFree.toFixed(2)}</strong> more for free shipping</span>
                      <span style={{ color: '#aaa' }}>{symbol}{manualSubtotal.toFixed(2)} / {symbol}{FREE_SHIP_THRESHOLD}</span>
                    </div>
                    <div style={{ height: 4, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#2d7a4f', borderRadius: 4, width: `${Math.min(100, (manualSubtotal / FREE_SHIP_THRESHOLD) * 100)}%`, transition: 'width 0.3s ease' }} />
                    </div>
                    {manualSuggestions.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontFamily: BODY, fontSize: 11.5, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>You might also like</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {manualSuggestions.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', background: '#faf9f7', borderRadius: 8, border: '1px solid #ece8e3' }}>
                              <div style={{ width: 38, height: 38, borderRadius: 6, flexShrink: 0, backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: p.tint || '#eee' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: DISPLAY, fontSize: 13, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                <div style={{ fontFamily: BODY, fontSize: 12, color: '#888' }}>{symbol}{Number(p.price).toFixed(2)}</div>
                              </div>
                              <button onClick={() => { cartAdd(p.id, null) }} style={{ flexShrink: 0, background: BLACK, color: '#fff', border: 'none', borderRadius: 16, padding: '5px 12px', fontFamily: BODY, fontSize: 12, cursor: 'pointer' }}>Add</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <button onClick={checkout} disabled={checkingOut || !!usOnlyError} style={{ width: '100%', background: BLACK, color: '#fff', border: 'none', borderRadius: 26, padding: '14px 0', fontFamily: BODY, fontSize: 15, letterSpacing: '0.03em', cursor: (checkingOut || usOnlyError) ? 'default' : 'pointer', opacity: (checkingOut || usOnlyError || !addr.line1.trim() || !addr.city.trim() || !addr.zip.trim() || !addr.country.trim()) ? 0.6 : 1 }}>
              {checkingOut ? 'Redirecting…' : user ? 'Checkout' : 'Sign in to check out'}
            </button>
            {!user && <div style={{ fontFamily: BODY, fontSize: 11.5, color: '#999', textAlign: 'center', marginTop: 8 }}>Create an account or sign in to complete your order and track it.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
