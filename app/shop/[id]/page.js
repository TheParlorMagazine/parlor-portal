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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}

function Description({ text }) {
  if (!text) return null
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
  const [imgIdx, setImgIdx] = useState(0)
  const [variantSel, setVariantSel] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const { symbol, currency, country } = useCurrency()
  const { add } = useCart()
  const wish = useWishlist()

  useEffect(() => {
    fetch('/api/shop/products').then(r => r.json())
      .then(d => setProducts(Array.isArray(d.products) ? d.products : []))
      .catch(() => setProducts([]))
  }, [])

  const { product, prev, next } = useMemo(() => {
    if (!products) return {}
    const i = products.findIndex(p => String(p.id) === String(id))
    return { product: products[i] || null, prev: products[i - 1] || null, next: products[i + 1] || null }
  }, [products, id])

  const variants = variantsOf(product)
  const chosen = variants.length ? (variants.find(v => String(v.printify_variant_id) === String(variantSel)) || variants[0]) : null
  const unit = chosen?.price != null ? Number(chosen.price) : Number(product?.price || 0)
  const images = product?.images?.length ? product.images : []

  function addToCart() {
    for (let i = 0; i < qty; i++) add(product.id, chosen?.printify_variant_id ?? null)
    setAdded(true)
    openCart() // open the global drawer over this page
  }

  return (
    <div style={{ background: PINK_BG, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,400&display=swap');
        .pdp-grid { display:grid; grid-template-columns:1.1fr 1fr; gap:56px; max-width:1180px; margin:0 auto; padding:44px 48px 80px; }
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
      `}</style>

      <ShopHeader activeCat={product?.category} />

      {product === null && products && (
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

              <div style={{ fontFamily: BODY, fontSize: 26, color: BLACK, marginBottom: 8 }}>{fmtPrice(unit, symbol)}</div>
              <div style={{ marginBottom: 28 }}>
                <BnplMessage amount={unit} currency={currency} country={country || 'US'} fontFamily={BODY} />
              </div>

              {variants.length > 1 && (
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

              <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', maxWidth: 460 }}>
                <button className="pdp-add" onClick={addToCart}>Add to Cart</button>
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

      <SiteFooter />
    </div>
  )
}
