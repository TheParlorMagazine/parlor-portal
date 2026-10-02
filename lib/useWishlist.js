'use client'

import { useState, useEffect, useCallback } from 'react'

// Saved-for-later wishlist, persisted to localStorage and shared across the
// storefront, product pages, and the wishlist page. Stores product ids.
const KEY = 'parlorWishlist'
const EVT = 'parlorwishlist'

function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
  try { window.dispatchEvent(new Event(EVT)) } catch {}
}

export function useWishlist() {
  const [ids, setIds] = useState([])
  useEffect(() => {
    setIds(read())
    const h = () => setIds(read())
    window.addEventListener(EVT, h)
    window.addEventListener('storage', h)
    return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', h) }
  }, [])

  const has = useCallback(id => ids.includes(id), [ids])
  const toggle = useCallback(id => {
    const cur = read()
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    write(next); setIds(next)
  }, [])
  const remove = useCallback(id => { const next = read().filter(x => x !== id); write(next); setIds(next) }, [])

  return { ids, has, toggle, remove, count: ids.length }
}
