'use client'

import { useState, useEffect, useMemo, use } from 'react'
import ShopHeader from '../../_components/ShopHeader'
import SiteFooter from '../../_components/SiteFooter'
import { useCurrency, fmtPrice } from '../../../lib/useCurrency'
import { useCart } from '../../../lib/useCart'
import { useWishlist } from '../../../lib/useWishlist'
import BnplMessage from '../../_components/BnplMessage'
import { openCart } from '../../../lib/cartUI'

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"
const BLACK = '#0a0a0a'
const PINK_BG = '#f6e4e7'

const variantsOf = p => (Array.isArray(p?.variants) ? p.variants : [])

// Escape HTML then apply lightweight markdown (**bold**, *italic*/_italic_) so the
// admin's plain-text description can carry emphasis, like the reference layout.
function fmtInline(s) {
  return (s || '')
    // Decode common HTML entities that Printify embeds in otherwise-plain text
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}

function Description({ text }) {
  if (!text) return null
  // Printify descriptions arrive as HTML; plain-text admin descriptions use markdown.
  const isHtml = /<[a-z][\s\S]*>/i.test(text)
  if (isHtml) {
    return (
      <div className="printify-desc" style={{ fontFamily: BODY, fontSize: 16.5, lineHeight: 1.75, color: '#2a2a2a' }}
        dangerouslySetInnerHTML={{ __html: text }} />
    )
  }
  const paras = text.split(/\n{2,}/)
  return (
    <div style={{ fontFamily: BODY, fontSize: 16.5, lineHeight: 1.75, color: '#2a2a2a' }}>
      {paras.map((p, i) => (
        <p key={i} style={{ margin: '0 0 18px' }} dangerouslySetInnerHTML={{ __html: fmtInline(p).replace(/\n/g, '<br/>') }} />
      ))}
    </div>
  )
}

function ShareLinks({ url, title }) {
  const u = encodeURIComponent(url), t = encodeURIComponent(title)
  const links = [
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`, '#1877f2', 'f'],
    ['Pinterest', `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`, '#e60023', 'P'],
    ['WhatsApp', `https://wa.me/?text=${t}%20${u}`, '#25d366', '✆'],
    ['X', `https://twitter.com/intent/tweet?url=${u}&text=${t}`, '#111', '𝕏'],
  ]
  return (
    <div style={{ display: 'flex', gap: 14, marginTop: 28 }}>
      {links.map(([name, href, color, glyph]) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${name}`}
          style={{ width: 30, height: 30, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontFamily: BODY, textDecoration: 'none' }}>{glyph}</a>
      ))}
    </div>
  )
}

export default function ProductPage({ params }) {
  const { id } = use(params)
  const [products, setProducts] = useState(null)
  const [bundles, setBundles] = useState(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [variantSel, setVariantSel] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [purchaseMode, setPurchaseMode] = useState('single') // 'single' | 'bundle'
  const [bundlePicks, setBundlePicks] = useState(['', '', '']) // product ids chosen for bundle
  const [bundleProducts, setBundleProducts] = useState([]) // referenced products for pick-your-own
  const [singlePick, setSinglePick] = useState('') // product id chosen when buying one from a bundle product
  const { symbol, currency, country } = useCurrency()
  const { add, cart } = useCart()
  const wish = useWishlist()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/api/shop/products').then(r => r.json())
      .then(d => setProducts(Array.isArray(d.products) ? d.products : []))
      .catch(() => setProducts([]))
    fetch('/api/shop/bundles').then(r => r.json())
      .then(d => setBundles(Array.isArray(d.bundles) ? d.bundles : []))
      .catch(() => setBundles([]))
  }, [])

  const loaded = products !== null && bundles !== null

  // Try to find the ID as a bundle first, then as a product.
  const bundle = useMemo(() => bundles?.find(b => String(b.id) === String(id)) || null, [bundles, id])

  const { product, prev, next } = useMemo(() => {
    if (!products || bundle) return {}
    const i = products.findIndex(p => String(p.id) === String(id))
    return { product: products[i] || null, prev: products[i - 1] || null, next: products[i + 1] || null }
  }, [products, bundle, id])

  const variants = variantsOf(product)
  const chosen = variants.length ? (variants.find(v => String(v.printify_variant_id) === String(variantSel)) || variants[0]) : null
  const unit = chosen?.price != null ? Number(chosen.price) : Number(product?.price || 0)
  const pickedProduct = singlePick ? bundleProducts.find(p => p.id === singlePick) : null
  const images = pickedProduct?.images?.length ? pickedProduct.images : (bundle?.images ?? product?.images ?? [])
  const notFound = loaded && !bundle && product === null

  // Bundle savings: sum individual item prices vs bundle price.
  const bundleIndividualTotal = useMemo(() => {
    if (!bundle) return 0
    return (bundle.shop_bundle_items || []).reduce((sum, bi) => {
      const p = bi.shop_products
      if (!p) return sum
      const price = Number(p.price || 0)
      return sum + price * (bi.quantity || 1)
    }, 0)
  }, [bundle])
  const bundleSavings = bundle ? Math.max(0, +(bundleIndividualTotal - Number(bundle.price || 0)).toFixed(2)) : 0

  const bundleConfig = product?.bundle_config
  const bundleQty = bundleConfig?.qty ?? 3
  const bundlePrice = bundleConfig?.price ?? 0
  // Price display: bundle mode → bundle price; single/buy-one mode → picked item's price (or first item's price)
  const singleUnitPrice = bundleConfig
    ? (pickedProduct?.price != null ? Number(pickedProduct.price) : (bundleProducts[0]?.price != null ? Number(bundleProducts[0].price) : unit))
    : unit
  const displayPrice = bundleConfig
    ? (purchaseMode === 'bundle' ? bundlePrice : singleUnitPrice)
    : unit
  const bundlePicksFilled = bundlePicks.slice(0, bundleQty).filter(Boolean).length === bundleQty

  // Fetch the products referenced in bundle_config.product_ids (may be inactive on storefront)
  useEffect(() => {
    const ids = bundleConfig?.product_ids
    if (!ids?.length) { setBundleProducts([]); return }
    fetch('/api/shop/products/by-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
      .then(r => r.json()).then(d => setBundleProducts(Array.isArray(d.products) ? d.products : []))
      .catch(() => setBundleProducts([]))
  }, [bundleConfig])

  function setBundlePick(i, val) {
    setBundlePicks(prev => { const next = [...prev]; next[i] = val; return next })
  }

  function addToCart() {
    if (bundle) {
      for (let i = 0; i < qty; i++) add(bundle.id, null)
      setAdded(true); openCart(); return
    }
    if (purchaseMode === 'bundle' && bundleConfig) {
      // Add the bundle product itself (active) as one cart line; picks stored in meta for fulfillment
      const picks = bundlePicks.slice(0, bundleQty).filter(Boolean)
      const pickNames = picks.map(pid => bundleProducts.find(p => p.id === pid)?.name || '')
      add(product.id, null, { bundle_picks: picks, bundle_picks_names: pickNames, bundle_price: bundlePrice })
      setAdded(true); openCart(); return
    }
    // "Buy one" from a bundle product — add bundle product with single_pick meta
    if (bundleConfig && singlePick) {
      const pick = bundleProducts.find(p => p.id === singlePick)
      const pickImg = pick?.images?.[0] || null
      for (let i = 0; i < qty; i++) add(product.id, null, { single_pick: singlePick, single_pick_name: pick?.name || '', single_pick_price: Number(pick?.price || 0), single_pick_image: pickImg })
      setAdded(true); openCart(); return
    }
    for (let i = 0; i < qty; i++) add(product.id, chosen?.printify_variant_id ?? null)
    setAdded(true)
    openCart()
  }

  const FabCart = () => (
    <button
      className={`shop-fab-cart${scrolled ? ' show' : ''}`}
      aria-label={`Cart, ${cart.length} item${cart.length === 1 ? '' : 's'}`}
      onClick={openCart}>
      <div style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        <span style={{ position: 'absolute', top: -2, right: -4, background: '#fff', color: BLACK, fontFamily: BODY, fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cart.length}</span>
      </div>
    </button>
  )

  const sharedStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,400&display=swap');
    .pdp-grid { display:grid; grid-template-columns:1.1fr 1fr; gap:56px; padding:44px 48px 80px; }
    .pdp-main-img { width:100%; aspect-ratio:1/1; border-radius:6px; background-color:#fff; background-size:cover; background-position:center; background-repeat:no-repeat; box-shadow:0 8px 30px rgba(0,0,0,0.08); }
    .pdp-thumbs { display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
    .pdp-thumb { width:66px; height:66px; border-radius:5px; background-color:#fff; background-size:cover; background-position:center; background-repeat:no-repeat; cursor:pointer; border:2px solid transparent; }
    .pdp-thumb.active { border-color:#0a0a0a; }
    .pdp-qty { display:inline-flex; align-items:center; border:1px solid #cbb8bd; border-radius:4px; overflow:hidden; }
    .pdp-qty button { width:42px; height:44px; border:none; background:#fff; font-size:18px; color:#555; cursor:pointer; }
    .pdp-qty span { width:48px; text-align:center; font-family:${BODY}; font-size:15px; }
    .pdp-add { flex:1; background:${BLACK}; color:#fff; border:none; border-radius:2px; padding:16px 0; font-family:${BODY}; font-size:15.5px; letter-spacing:.02em; cursor:pointer; }
    .pdp-add:hover { background:#333; }
    @media (max-width:860px){ .pdp-grid { grid-template-columns:1fr; gap:32px; padding:28px 20px 60px; } }
    .shop-fab-cart { position:fixed; bottom:26px; right:26px; z-index:100; width:60px; height:60px; border-radius:50%; background:${BLACK}; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 28px rgba(0,0,0,0.32); opacity:0; transform:translateY(14px) scale(0.9); pointer-events:none; transition:opacity 0.25s ease, transform 0.25s cubic-bezier(.34,1.56,.64,1); }
    .shop-fab-cart.show { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
    .shop-fab-cart:hover { transform:translateY(0) scale(1.07); }
    @media (max-width:560px){ .shop-fab-cart { bottom:18px; right:18px; width:54px; height:54px; } }
    .printify-desc p { margin:0 0 14px; }
    .printify-desc ul,.printify-desc ol { margin:0 0 14px; padding-left:22px; }
    .printify-desc li { margin-bottom:6px; }
    .printify-desc strong { font-weight:700; }
    .printify-desc em { font-style:italic; }
  `

  // ── Bundle detail page ──────────────────────────────────────────────────────
  if (bundle) {
    const bundleItems = bundle.shop_bundle_items || []
    return (
      <div style={{ background: PINK_BG, minHeight: '100vh' }}>
        <style>{sharedStyles}</style>
        <ShopHeader activeCat={bundle.category} />

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 48px 0', fontFamily: BODY, fontSize: 14, color: '#8a6b72' }}>
          <a href="/" style={{ color: '#8a6b72', textDecoration: 'none' }}>Home</a> / <a href="/shop" style={{ color: '#8a6b72', textDecoration: 'none' }}>All Products</a> / <span style={{ color: '#5a3d44' }}>{bundle.title}</span>
        </div>

        <div className="pdp-grid">
          {/* Left: gallery + description */}
          <div>
            <div className="pdp-main-img" style={{ backgroundImage: images[imgIdx] ? `url(${images[imgIdx]})` : undefined, backgroundColor: images[imgIdx] ? undefined : '#f0e8ea' }} />
            {images.length > 1 && (
              <div className="pdp-thumbs">
                {images.map((src, i) => (
                  <div key={src} className={`pdp-thumb${i === imgIdx ? ' active' : ''}`} style={{ backgroundImage: `url(${src})` }} onClick={() => setImgIdx(i)} />
                ))}
              </div>
            )}
            {bundle.description && (
              <div style={{ marginTop: 34 }}>
                <Description text={bundle.description} />
              </div>
            )}

            {/* What's included */}
            {bundleItems.length > 0 && (
              <div style={{ marginTop: 36 }}>
                <div style={{ fontFamily: BODY, fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a6b72', marginBottom: 14 }}>What's included</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {bundleItems.map((bi, idx) => {
                    const p = bi.shop_products
                    if (!p) return null
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid rgba(203,184,189,0.4)' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 6, flexShrink: 0, backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#eee' }} />
                        <div style={{ flex: 1 }}>
                          <a href={`/shop/${p.id}`} style={{ fontFamily: DISPLAY, fontSize: 15, color: BLACK, textDecoration: 'none', display: 'block' }}>{p.name}</a>
                          {bi.quantity > 1 && <div style={{ fontFamily: BODY, fontSize: 12.5, color: '#8a6b72', marginTop: 2 }}>Qty: {bi.quantity}</div>}
                        </div>
                        <div style={{ fontFamily: BODY, fontSize: 14, color: '#5a3d44', flexShrink: 0 }}>{fmtPrice(Number(p.price || 0), symbol)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: purchase panel */}
          <div>
            <div style={{ display: 'inline-block', fontFamily: BODY, fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#f2b8c6', color: '#7a2531', borderRadius: 16, padding: '5px 13px', marginBottom: 14 }}>Bundle</div>
            <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, color: BLACK, margin: '0 0 18px', lineHeight: 1.1 }}>{bundle.title}</h1>

            <div style={{ fontFamily: BODY, fontSize: 26, color: BLACK, marginBottom: 4 }}>{fmtPrice(Number(bundle.price || 0), symbol)}</div>

            {bundleSavings > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontFamily: BODY, fontSize: 13.5, color: '#8a6b72', marginBottom: 4 }}>
                  Individual total: <span style={{ textDecoration: 'line-through' }}>{fmtPrice(bundleIndividualTotal, symbol)}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0faf4', border: '1px solid #c6e8d2', borderRadius: 20, padding: '5px 13px' }}>
                  <span style={{ fontSize: 13 }}>✓</span>
                  <span style={{ fontFamily: BODY, fontSize: 13.5, color: '#2d7a4f', fontWeight: 600 }}>You save {fmtPrice(bundleSavings, symbol)}</span>
                </div>
              </div>
            )}

            <div style={{ fontFamily: BODY, fontSize: 13.5, color: '#5a3d44', marginBottom: 8 }}>Quantity</div>
            <div className="pdp-qty" style={{ marginBottom: 26 }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(q => Math.min(20, q + 1))}>+</button>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', maxWidth: 460 }}>
              <button className="pdp-add" onClick={addToCart}>Add Bundle to Cart</button>
            </div>

            {added && (
              <div style={{ marginTop: 16, fontFamily: BODY, fontSize: 14.5, color: '#2d8f5a' }}>
                ✓ Added to cart — <button onClick={openCart} style={{ background: 'none', border: 'none', padding: 0, color: BLACK, fontWeight: 600, fontFamily: BODY, fontSize: 14.5, cursor: 'pointer', textDecoration: 'underline' }}>View cart &amp; checkout →</button>
              </div>
            )}

            <div style={{ marginTop: 22, fontFamily: BODY, fontSize: 13, color: '#8a6b72' }}>
              Shipping calculated at checkout.
            </div>

            <ShareLinks url={typeof window !== 'undefined' ? window.location.href : ''} title={bundle.title} />
          </div>
        </div>

        <FabCart />
        <SiteFooter />
      </div>
    )
  }

  // ── Regular product detail page ─────────────────────────────────────────────
  return (
    <div style={{ background: PINK_BG, minHeight: '100vh' }}>
      <style>{sharedStyles}</style>

      <ShopHeader activeCat={product?.category} />

      {notFound && (
        <div style={{ textAlign: 'center', padding: '120px 20px', fontFamily: BODY, color: '#7a5560' }}>Product not found. <a href="/shop" style={{ color: BLACK }}>Back to the shop →</a></div>
      )}

      {product && (
        <>
          {/* Breadcrumb + prev/next */}
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 48px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: BODY, fontSize: 14 }}>
            <div style={{ color: '#8a6b72' }}>
              <a href="/" style={{ color: '#8a6b72', textDecoration: 'none' }}>Home</a> / <a href="/shop" style={{ color: '#8a6b72', textDecoration: 'none' }}>All Products</a> / <span style={{ color: '#5a3d44' }}>{product.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, color: '#5a3d44' }}>
              {prev ? <a href={`/shop/${prev.id}`} style={{ color: '#5a3d44', textDecoration: 'none' }}>‹ Prev</a> : <span style={{ color: '#c4a9b0' }}>‹ Prev</span>}
              <span style={{ color: '#c4a9b0' }}>|</span>
              {next ? <a href={`/shop/${next.id}`} style={{ color: '#5a3d44', textDecoration: 'none' }}>Next ›</a> : <span style={{ color: '#c4a9b0' }}>Next ›</span>}
            </div>
          </div>

          <div className="pdp-grid">
            {/* Left: gallery + description */}
            <div>
              <div className="pdp-main-img" style={{ backgroundImage: images[imgIdx] ? `url(${images[imgIdx]})` : undefined, backgroundColor: images[imgIdx] ? undefined : (product.tint || '#fff') }} />
              {images.length > 1 && (
                <div className="pdp-thumbs">
                  {images.map((src, i) => (
                    <div key={src} className={`pdp-thumb${i === imgIdx ? ' active' : ''}`} style={{ backgroundImage: `url(${src})` }} onClick={() => setImgIdx(i)} />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 34 }}>
                <Description text={product.description} />
              </div>
            </div>

            {/* Right: purchase panel */}
            <div>
              <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, color: BLACK, margin: '4px 0 22px', lineHeight: 1.1 }}>{product.name}</h1>
              {product.variant && <div style={{ fontFamily: BODY, fontSize: 16, color: '#7a5560', marginTop: -14, marginBottom: 20 }}>{product.variant}</div>}

              <div style={{ fontFamily: BODY, fontSize: 26, color: BLACK, marginBottom: 8 }}>{fmtPrice(displayPrice, symbol)}</div>
              <div style={{ marginBottom: 28 }}>
                <BnplMessage amount={displayPrice} currency={currency} country={country || 'US'} fontFamily={BODY} />
              </div>

              {/* Purchase mode tabs — only shown for collection products */}
              {bundleConfig && (
                <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #cbb8bd', borderRadius: 6, overflow: 'hidden', maxWidth: 360 }}>
                  {[['single', 'Buy one'], ['bundle', `Bundle of ${bundleQty} — ${symbol}${bundlePrice}`]].map(([mode, label]) => (
                    <button key={mode} onClick={() => setPurchaseMode(mode)}
                      style={{ flex: 1, padding: '10px 12px', border: 'none', fontFamily: BODY, fontSize: 13.5, cursor: 'pointer', background: purchaseMode === mode ? BLACK : '#fff', color: purchaseMode === mode ? '#fff' : '#5a3d44', transition: 'background 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Bundle pick-your-own selectors */}
              {bundleConfig && purchaseMode === 'bundle' ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: BODY, fontSize: 13, color: '#5a3d44', marginBottom: 12 }}>
                    Choose any {bundleQty} — <span style={{ color: '#8a6b72' }}>{bundlePicks.filter(Boolean).length}/{bundleQty} selected</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, marginBottom: 14 }}>
                    {bundleProducts.map(p => {
                      const img = p.images?.[0]
                      const pickCount = bundlePicks.filter(id => id === p.id).length
                      const isSelected = pickCount > 0
                      const nextSlot = bundlePicks.findIndex(id => !id)
                      const canAdd = nextSlot !== -1
                      function handleClick() {
                        if (isSelected) {
                          // deselect last occurrence
                          const idx = bundlePicks.map((id,i) => id === p.id ? i : -1).filter(i => i !== -1).pop()
                          setBundlePick(idx, '')
                        } else if (canAdd) {
                          setBundlePick(nextSlot, p.id)
                        }
                      }
                      return (
                        <div key={p.id} onClick={handleClick}
                          style={{ cursor: canAdd || isSelected ? 'pointer' : 'default', borderRadius: 6, border: isSelected ? '2px solid #c4717e' : '2px solid #e8d5d8', overflow: 'hidden', opacity: !canAdd && !isSelected ? 0.45 : 1, position: 'relative', background: '#fdf5f6' }}>
                          {img
                            ? <img src={img} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                            : <div style={{ width: '100%', aspectRatio: '1', background: '#f0dde0' }} />}
                          {isSelected && (
                            <div style={{ position: 'absolute', top: 4, right: 4, background: '#c4717e', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                              {pickCount > 1 ? pickCount : '✓'}
                            </div>
                          )}
                          <div style={{ padding: '5px 6px', fontFamily: BODY, fontSize: 11, color: '#5a3d44', lineHeight: 1.3 }}>{p.name}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontFamily: BODY, fontSize: 13, color: '#8a6b72' }}>
                    {symbol}{bundlePrice} total · {symbol}{(bundlePrice / bundleQty).toFixed(2)} each
                  </div>
                </div>
              ) : (
                <>
                  {/* If this is a bundle product in "Buy one" mode, show item picker with image switching */}
                  {bundleConfig && bundleProducts.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontFamily: BODY, fontSize: 13, color: '#5a3d44', marginBottom: 10 }}>Choose a print:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 12 }}>
                        {bundleProducts.map(p => {
                          const img = p.images?.[0]
                          const selected = singlePick === p.id
                          return (
                            <div key={p.id} onClick={() => { setSinglePick(p.id); if (img) setImgIdx(0) }}
                              style={{ cursor: 'pointer', borderRadius: 6, border: selected ? '2px solid #c4717e' : '2px solid #e8d5d8', overflow: 'hidden', position: 'relative', background: '#fdf5f6' }}>
                              {img
                                ? <img src={img} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                                : <div style={{ width: '100%', aspectRatio: '1', background: '#f0dde0' }} />}
                              {selected && (
                                <div style={{ position: 'absolute', top: 3, right: 3, background: '#c4717e', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>
                              )}
                              <div style={{ padding: '4px 5px', fontFamily: BODY, fontSize: 10.5, color: '#5a3d44', lineHeight: 1.3 }}>{p.name}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {variants.length > 1 && !bundleConfig && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontFamily: BODY, fontSize: 13, color: '#5a3d44', marginBottom: 7 }}>Option</div>
                      <select value={String(chosen?.printify_variant_id ?? '')} onChange={e => setVariantSel(e.target.value)}
                        style={{ width: '100%', maxWidth: 320, padding: '11px 12px', border: '1px solid #cbb8bd', borderRadius: 3, fontFamily: BODY, fontSize: 15, background: '#fff', cursor: 'pointer' }}>
                        {variants.map(v => <option key={v.printify_variant_id} value={String(v.printify_variant_id)}>{v.name || 'Option'}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ fontFamily: BODY, fontSize: 13.5, color: '#5a3d44', marginBottom: 8 }}>Quantity</div>
                  <div className="pdp-qty" style={{ marginBottom: 26 }}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(q => Math.min(20, q + 1))}>+</button>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', maxWidth: 460 }}>
                <button className="pdp-add" onClick={addToCart}
                  disabled={bundleConfig && purchaseMode === 'bundle' && !bundlePicksFilled}
                  style={{ opacity: bundleConfig && purchaseMode === 'bundle' && !bundlePicksFilled ? 0.45 : 1 }}>
                  {bundleConfig && purchaseMode === 'bundle' ? `Add Bundle — ${symbol}${bundlePrice}` : 'Add to Cart'}
                </button>
                <button onClick={() => wish.toggle(product.id)} aria-label={wish.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'} title="Wishlist"
                  style={{ width: 52, flexShrink: 0, border: '1px solid #cbb8bd', borderRadius: '50%', background: '#fff', cursor: 'pointer', fontSize: 20, color: wish.has(product.id) ? '#c4364a' : '#8a6b72', lineHeight: 1 }}>
                  {wish.has(product.id) ? '♥' : '♡'}
                </button>
              </div>

              {added && (
                <div style={{ marginTop: 16, fontFamily: BODY, fontSize: 14.5, color: '#2d8f5a' }}>
                  ✓ Added to cart — <button onClick={openCart} style={{ background: 'none', border: 'none', padding: 0, color: BLACK, fontWeight: 600, fontFamily: BODY, fontSize: 14.5, cursor: 'pointer', textDecoration: 'underline' }}>View cart &amp; checkout →</button>
                </div>
              )}

              <div style={{ marginTop: 22, fontFamily: BODY, fontSize: 13, color: '#8a6b72' }}>
                {product.fulfillment === 'external' ? 'Ships from our partner store.' : 'Shipping calculated at checkout.'}
              </div>

              <ShareLinks url={typeof window !== 'undefined' ? window.location.href : ''} title={product.name} />
            </div>
          </div>
        </>
      )}

      <FabCart />
      <SiteFooter />
    </div>
  )
}
