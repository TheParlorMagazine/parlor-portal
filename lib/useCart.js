'use client'

import { useState, useEffect, useCallback } from 'react'

// Shared shop cart, persisted to localStorage so it's the same across the
// storefront index and each product page. Lines are { id, vid, meta? } where
// vid = chosen printify_variant_id (or null) and meta holds optional overrides
// like { bundle_unit_price }. A custom event keeps every mounted hook in sync.
const KEY = 'parlorCart'
const EVT = 'parlorcart'

function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
  try { window.dispatchEvent(new Event(EVT)) } catch {}
}
export const lineKey = (id, vid, meta) => `${id}|${vid ?? ''}|${meta?.bundle_unit_price ?? ''}|${meta?.bundleGroupId ?? ''}`

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

  return { cart, add, dec, removeAll, clear }
}
