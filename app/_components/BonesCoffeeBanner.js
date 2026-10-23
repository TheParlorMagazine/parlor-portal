'use client'

import { useEffect, useState } from 'react'
import { selectBonesProducts } from '../../lib/bonesProducts'

export default function BonesCoffeeBanner({ visible }) {
  const [products, setProducts] = useState([])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/shop/products', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Catalogue unavailable')
      return response.json()
    }).then(data => setProducts(selectBonesProducts(data.products || []))).catch(() => {})
    return () => controller.abort()
  }, [])
  if (!products.length) return null
  return <>
    <style>{`
      .bones-banner,.bones-banner *{box-sizing:border-box}
      .bones-banner{position:fixed;right:12px;top:12px;bottom:12px;transform:none;display:flex;flex-direction:column;width:calc((100vw - 720px)/2 - 24px);max-width:260px;height:calc(100dvh - 24px);max-height:calc(100dvh - 24px);overflow:auto;z-index:90;border:1px solid #e3bdc9;border-radius:12px;padding:12px;background:#fff8fa;box-shadow:0 6px 24px #00000012;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .5s ease}
      .bones-banner.shown{opacity:1;visibility:visible;pointer-events:auto}
      .bones-heading{font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:center;margin:0 0 10px;color:#492632}
      .bones-shop-link{display:block;text-align:center;font-family:Georgia,serif;font-size:12px;color:#744052;margin:-4px 0 12px;text-underline-offset:3px}
      .bones-shop-link:focus-visible{outline:2px solid #7a2531;outline-offset:2px}
      .bones-tiles{display:grid;gap:10px;flex:1;min-height:0;grid-auto-rows:minmax(0,1fr)}
      .bones-tile{display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px;background:#fff;border:1px solid #ecd6de;border-radius:8px;color:#21191d;text-decoration:none;gap:7px;min-height:0;justify-content:center}
      .bones-tile img{width:100%;height:90px;flex:1;min-height:0;object-fit:contain}
      .bones-name{font-family:Georgia,serif;font-size:12px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .bones-buy{background:#111;color:white;border-radius:5px;padding:6px 12px;font-family:Georgia,serif;font-size:12px;font-weight:700}
      .bones-tile:hover .bones-buy{background:#7a2531}
      .bones-tile:focus-visible{outline:2px solid #7a2531;outline-offset:2px}
      @media(max-width:1100px){
        .bones-banner{top:auto;bottom:0;right:0;left:0;transform:none;width:100%;max-width:none;height:auto;max-height:none;padding:6px 8px calc(6px + env(safe-area-inset-bottom));border-radius:10px 10px 0 0}
        .bones-heading{font-size:11px;margin-bottom:4px}
        .bones-shop-link{font-size:10px;margin:0 0 5px}
        .bones-tiles{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
        .bones-tile{padding:5px;gap:4px;min-width:0}
        .bones-tile img{height:38px;flex:none}
        .bones-name{font-size:10px;line-height:1.1;height:22px}
        .bones-buy{font-size:10px;padding:4px 9px}
      }
      @media(prefers-reduced-motion:reduce){.bones-banner{transition:none}}
    `}</style>
    <aside className={`bones-banner${visible ? ' shown' : ''}`} aria-label="Bones Coffee products" aria-hidden={!visible}>
      <h2 className="bones-heading">Bones Coffee Favorites</h2>
      <a className="bones-shop-link" href="/shop">From the Parlor Shop</a>
      <div className="bones-tiles">{products.map(product => <a key={product.id} className="bones-tile" href={`/shop/${encodeURIComponent(product.id)}`} aria-label={`Buy now: ${product.name}`}>
        {product.images?.[0] && <img src={product.images[0]} alt={product.name} />}
        <span className="bones-name">{product.name}</span>
        <span className="bones-buy">Buy now</span>
      </a>)}</div>
    </aside>
  </>
}
