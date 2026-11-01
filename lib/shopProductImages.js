export const SHOP_PRODUCT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SITE = 'https://theparlormagazine.com'

export function printifyImageSource(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['images.printify.com', 'images-api.printify.com'].includes(url.hostname) ? url.href : null
  } catch { return null }
}

// Stable product/index URL, not an arbitrary URL proxy. Changing the source
// changes the cache key without publishing signed upstream query parameters.
export function shopProductImageUrl(product, value, index) {
  const source = printifyImageSource(value)
  if (!source || !SHOP_PRODUCT_ID.test(product?.id) || !Number.isInteger(index) || index < 0) return value
  let hash = 2166136261
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619)
  return `${SITE}/shop/product-image/${product.id}/${index}?v=${(hash >>> 0).toString(16)}`
}

export function publicShopProduct(product) {
  return { ...product, images: Array.isArray(product.images)
    ? product.images.map((value, index) => shopProductImageUrl(product, value, index)) : product.images }
}
