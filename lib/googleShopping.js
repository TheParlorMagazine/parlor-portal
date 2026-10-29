const SITE = 'https://theparlormagazine.com'
export const SHOPPING_PRODUCT_FIELDS = 'id, active, name, variant, description, category, price, images, inventory, fulfillment, external_url, variants, printify_product_id, printify_variant_id, ships_to, bundle_config'
export const SHOP_PRODUCT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function webUrl(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
export function productText(value) {
  return String(value || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
        return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : ''
      }
      return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[code.toLowerCase()] || entity
    }).replace(/[\u0000-\u001f\u007f-\u009f\ufffe\uffff]/g, ' ').replace(/\s+/g, ' ').trim()
}

// The landing page initially selects variants[0]. Advertise that exact offer,
// never the parent minimum price or an option the landing page doesn't select.
export function shoppingProduct(product, { country = 'US' } = {}) {
  if (!product?.active || !SHOP_PRODUCT_ID.test(product.id) || product.external_url || product.bundle_config || !['manual', 'printify'].includes(product.fulfillment || 'manual')) return null
  if (product.ships_to === 'us_only' && country !== 'US') return null
  if (Array.isArray(product.ships_to) && product.ships_to.length && !product.ships_to.includes(country)) return null
  const variant = Array.isArray(product.variants) ? product.variants[0] : null
  const price = Number(variant?.price ?? product.price)
  const cents = Math.round(price * 100)
  const name = productText(product.name).slice(0, 150)
  const description = productText(product.description).slice(0, 5000)
  const images = [...new Set((Array.isArray(product.images) ? product.images : []).map(webUrl).filter(Boolean))].slice(0, 11)
  if (!name || !description || !images.length || !Number.isSafeInteger(cents) || cents <= 0) return null
  const inventories = [product.inventory, variant?.inventory].filter(n => n != null)
  if (inventories.some(n => !Number.isFinite(Number(n)) || Number(n) < 0)) return null
  if (product.fulfillment === 'printify') {
    const id = variant?.printify_variant_id ?? product.printify_variant_id
    if (!(variant?.printify_product_id || product.printify_product_id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) return null
  }
  return { id: product.id, name, description, images, price: (cents / 100).toFixed(2),
    url: `${SITE}/shop/${encodeURIComponent(product.id)}`, category: productText(product.category),
    available: !inventories.some(n => Number(n) < 1) }
}

const xml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const tag = (name, value) => `<g:${name}>${xml(value)}</g:${name}>`
export function googleShoppingFeed(products) {
  const items = products.map(p => shoppingProduct(p)).filter(Boolean).map(p => `<item>${[
    tag('id', p.id), tag('title', p.name), tag('description', p.description), tag('link', p.url),
    tag('image_link', p.images[0]), ...p.images.slice(1).map(url => tag('additional_image_link', url)),
    tag('availability', p.available ? 'in_stock' : 'out_of_stock'), tag('price', `${p.price} USD`),
    tag('condition', 'new'), ...(p.category ? [tag('product_type', p.category)] : []),
  ].join('')}</item>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>The Parlor Shop</title><link>${SITE}/shop</link><description>Physical products from The Parlor Shop. Prices in USD.</description>\n${items}\n</channel></rss>`
}

export function productStructuredData(product, { currency = 'USD', country = 'US' } = {}) {
  const p = shoppingProduct(product, { country })
  if (!p || !['USD', 'EUR', 'GBP'].includes(currency)) return null
  return { '@context': 'https://schema.org', '@type': 'Product', '@id': `${p.url}#product`,
    name: p.name, description: p.description, image: p.images, url: p.url,
    offers: { '@type': 'Offer', url: p.url, price: p.price, priceCurrency: currency,
      availability: `https://schema.org/${p.available ? 'InStock' : 'OutOfStock'}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'The Parlor Magazine', url: SITE } } }
}

export async function loadShoppingProducts(db) {
  const rows = [], pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from('shop_products').select(SHOPPING_PRODUCT_FIELDS)
      .eq('active', true).order('id', { ascending: true }).range(offset, offset + pageSize - 1)
    if (error || !Array.isArray(data)) throw new Error('Shop catalogue unavailable')
    rows.push(...data)
    if (data.length < pageSize) return rows
  }
}
