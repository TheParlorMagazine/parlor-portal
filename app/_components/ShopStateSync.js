'use client'

import { useEffect } from 'react'
import { createClient } from '../../lib/supabase'

// Keeps a signed-in member's cart + wishlist synced to their account (so they
// carry across devices). Guests are untouched — everything stays in localStorage.
// Renders nothing; mount once on shop pages.
const read = k => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
const writeCart = v => { try { localStorage.setItem('parlorCart', JSON.stringify(v)); window.dispatchEvent(new Event('parlorcart')) } catch {} }
const writeWish = v => { try { localStorage.setItem('parlorWishlist', JSON.stringify(v)); window.dispatchEvent(new Event('parlorwishlist')) } catch {} }

export default function ShopStateSync() {
  useEffect(() => {
    const sb = createClient()
    let token = null
    let syncing = false

    async function push() {
      if (!token) return
      try {
        await fetch('/api/portal/shop-state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cart: read('parlorCart'), wishlist: read('parlorWishlist') }),
        })
      } catch {}
    }

    async function pullAndMerge(session) {
      token = session?.access_token || null
      if (!token) return
      syncing = true
      try {
        const r = await fetch('/api/portal/shop-state', { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json().catch(() => ({}))
        const serverCart = Array.isArray(d.cart) ? d.cart : []
        const serverWish = Array.isArray(d.wishlist) ? d.wishlist : []
        const localCart = read('parlorCart')
        const localWish = read('parlorWishlist')
        // Wishlist: union of product ids. Cart: keep local if this device has one,
        // otherwise adopt the saved cart.
        const mergedWish = [...new Set([...localWish, ...serverWish])]
        const mergedCart = localCart.length ? localCart : serverCart
        if (JSON.stringify(mergedWish) !== JSON.stringify(localWish)) writeWish(mergedWish)
        if (JSON.stringify(mergedCart) !== JSON.stringify(localCart)) writeCart(mergedCart)
      } catch {}
      syncing = false
      push() // persist the merged result
    }

    let t
    const onChange = () => { if (!token || syncing) return; clearTimeout(t); t = setTimeout(push, 700) }
    window.addEventListener('parlorcart', onChange)
    window.addEventListener('parlorwishlist', onChange)

    sb.auth.getSession().then(({ data }) => pullAndMerge(data?.session)).catch(() => {})
    const { data: authSub } = sb.auth.onAuthStateChange((_e, session) => {
      if (session) pullAndMerge(session)
      else token = null
    })

    return () => {
      window.removeEventListener('parlorcart', onChange)
      window.removeEventListener('parlorwishlist', onChange)
      authSub?.subscription?.unsubscribe?.()
      clearTimeout(t)
    }
  }, [])
  return null
}
