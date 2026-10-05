// Printify REST client (print-on-demand dropshipping).
// Docs: https://developers.printify.com/  — auth is a Personal Access Token.
// Set PRINTIFY_API_TOKEN (and optionally PRINTIFY_SHOP_ID) in the environment.

const BASE = 'https://api.printify.com/v1'

export function printifyConfigured() {
  return !!process.env.PRINTIFY_API_TOKEN
}

async function pf(path, { method = 'GET', body } = {}) {
  const token = process.env.PRINTIFY_API_TOKEN
  if (!token) throw new Error('PRINTIFY_API_TOKEN is not set')
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TheParlor/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-json */ }
  if (!res.ok) {
    const msg = json?.message || json?.error || text || `Printify ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return json
}

export async function listShops() {
  return pf('/shops.json') // → [{ id, title, sales_channel }]
}

// Resolve the shop id to use: explicit env var, else the first shop on the account.
export async function resolveShopId() {
  if (process.env.PRINTIFY_SHOP_ID) return process.env.PRINTIFY_SHOP_ID
  const shops = await listShops()
  return shops?.[0]?.id ? String(shops[0].id) : null
}

export async function listProducts(shopId, { page = 1, limit = 50 } = {}) {
  const r = await pf(`/shops/${shopId}/products.json?limit=${limit}&page=${page}`)
  return r?.data || []
}

export async function getProduct(shopId, productId) {
  return pf(`/shops/${shopId}/products/${productId}.json`)
}

export async function createOrder(shopId, payload) {
  return pf(`/shops/${shopId}/orders.json`, { method: 'POST', body: payload })
}

// Live shipping quote for a set of line items to a country. Printify accepts a
// country-only address for standard shipping and returns costs in cents (in the
// shop's currency): { standard, express, priority, printify_express }.
export async function calcShipping(shopId, lineItems, country) {
  return pf(`/shops/${shopId}/orders/shipping.json`, {
    method: 'POST',
    body: { line_items: lineItems, address_to: { country } },
  })
}

// Strip HTML tags from Printify's rich descriptions for plain-text storage.
export function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Map a raw Printify product into our shop_products shape. Keeps admin-owned
// fields (category/featured/sort/active) out — those are set/preserved locally.
export function mapPrintifyProduct(p, shopId) {
  const images = (p.images || []).map(i => i.src).filter(Boolean)
  const enabled = (p.variants || []).filter(v => v.is_enabled)
  const priced = enabled.length ? enabled : (p.variants || [])
  const cents = priced.map(v => v.price).filter(n => typeof n === 'number')
  const minCents = cents.length ? Math.min(...cents) : 0
  const variants = priced.map(v => ({
    name: v.title || null,
    printify_variant_id: v.id,
    price: typeof v.price === 'number' ? +(v.price / 100).toFixed(2) : null,
    sku: v.sku || null,
  }))
  return {
    name: p.title || 'Untitled',
    description: stripHtml(p.description),
    images,
    price: +(minCents / 100).toFixed(2),
    fulfillment: 'printify',
    printify_product_id: String(p.id),
    printify_shop_id: String(shopId),
    printify_variant_id: variants[0]?.printify_variant_id ?? null,
    print_provider_id: p.print_provider_id ?? null,
    variants,
    printify_data: p,
  }
}
