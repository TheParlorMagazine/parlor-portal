'use client'

// Retain requests made before the global drawer attaches its listener.
function open(tab) {
  if (typeof window === 'undefined') return
  window.__parlorCartOpenRequest = { tab }
  window.dispatchEvent(new CustomEvent('parlor-cart-open', { detail: { tab } }))
}
export function takeCartRequest() {
  if (typeof window === 'undefined') return null
  const request = window.__parlorCartOpenRequest || null
  delete window.__parlorCartOpenRequest
  return request
}
export function openCart() { open('cart') }
export function openWishlist() { open('wishlist') }
