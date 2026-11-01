'use client'

import { useState, useEffect, useCallback } from 'react'

// Shared shop cart, persisted to localStorage so it's the same across the
// storefront index and each product page. Lines are { id, vid, meta? } where
// vid = chosen printify_variant_id (or null) and meta holds optional overrides
// like { bundle_unit_price }. A custom event keeps every mounted hook in sync.
const KEY = 'parlorCart'
const VER = 'parlorCartV'
const CART_VERSION = '2' // bump when cart entry shape changes to invalidate old data
const EVT = 'parlorcart'

function read() {
  try {
    if (localStorage.getItem(VER) !== CART_VERSION) { localStorage.removeItem(KEY); localStorage.setItem(VER, CART_VERSION); return [] }
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch { return [] }
}
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); localStorage.setItem('parlorCartInitialized','1') } catch {}
  try { window.dispatchEvent(new Event(EVT)) } catch {}
}
export const lineKey = (id, vid, meta) => `${id}|${vid ?? ''}|${meta?.bundle_unit_price ?? ''}|${meta?.bundleGroupId ?? ''}|${(meta?.bundle_picks ?? []).join(',')}|${meta?.single_pick ?? ''}`
export const uniqueLineCount = (cart) => new Set(cart.map(({ id, vid, meta }) => lineKey(id, vid, meta))).size

export function useCart() {
  const [cart, setCart] = useState([])
  useEffect(() => {
    setCart(read())
    const h = () => setCart(read())
    window.addEventListener(EVT, h)
    window.addEventListener('storage', h)
    return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', h) }
  }, [])

  const add = useCallback((id, vid = null, meta = null) => { const v = [...read(), { id, vid, ...(meta ? { meta } : {}) }]; write(v); setCart(v) }, [])
  const dec = useCallback(key => { const v = read(); const i = v.findIndex(x => lineKey(x.id, x.vid, x.meta) === key); if (i >= 0) v.splice(i, 1); write(v); setCart(v) }, [])
  const removeAll = useCallback(key => { const v = read().filter(x => lineKey(x.id, x.vid, x.meta) !== key); write(v); setCart(v) }, [])
  const clear = useCallback(() => { write([]); setCart([]) }, [])

  const completePurchase = useCallback(sessionId => {
    try {
      const key='parlor-checkout-cart:'+sessionId
      const snapshot=JSON.parse(localStorage.getItem(key) || 'null')
      if(!Array.isArray(snapshot))return
      const remaining=read()
      for(const item of snapshot){
        const index=remaining.findIndex(line=>lineKey(line.id,line.vid,line.meta)===lineKey(item.id,item.vid,item.meta))
        if(index>=0)remaining.splice(index,1)
      }
      // Consume the local snapshot before broadcasting; refresh/Strict Mode must not subtract twice.
      localStorage.removeItem(key)
      write(remaining);setCart(remaining)
    } catch {}
  }, [])
  return { cart, add, dec, removeAll, clear, completePurchase }
}
