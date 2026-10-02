'use client'

// Open the global cart drawer from anywhere (any page, any header). The drawer
// (app/_components/CartDrawer.js) listens for this event and opens in place.
export function openCart() {
  try { window.dispatchEvent(new CustomEvent('parlor-cart-open', { detail: { tab: 'cart' } })) } catch {}
}
export function openWishlist() {
  try { window.dispatchEvent(new CustomEvent('parlor-cart-open', { detail: { tab: 'wishlist' } })) } catch {}
}
