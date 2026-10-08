import { printifyConfigured, resolveShopId, calcShipping } from './printify'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Fallback flat rate (cents) when Shippo is not configured or the live quote fails.
export const MANUAL_SHIP_CENTS = 500

// Self-fulfilled orders over this threshold ship free (same-numeral: $100/£100/€100).
export const MANUAL_FREE_SHIP_THRESHOLD = 100

// FROM address — update to your actual fulfillment warehouse address.
const FROM_ADDRESS = {
  name: 'The Parlor Magazine',
  street1: process.env.SHIP_FROM_STREET || '123 Main St',
  city: process.env.SHIP_FROM_CITY || 'New York',
  state: process.env.SHIP_FROM_STATE || 'NY',
  zip: process.env.SHIP_FROM_ZIP || '10001',
  country: process.env.SHIP_FROM_COUNTRY || 'US',
}

// Country → Shippo-recognized country code mapping (already ISO-3166, so passthrough).
// Shippo uses USPS Media Mail for domestic US only; international falls back to Priority.
function isUSPS(country) { return (country || 'US').toUpperCase() === 'US' }

// Fetch a live Shippo rate for a manual shipment. Returns cents in the same-numeral
// model (i.e. the raw dollar amount × 100, without currency conversion — callers
// pass the display currency separately). Falls back to MANUAL_SHIP_CENTS on any error.
async function quoteShippoRate(country, weightOz, isMedia) {
  const token = process.env.SHIPPO_API_KEY
  if (!token) return MANUAL_SHIP_CENTS

  const to = {
    // Minimum fields for a rate quote — no personal info needed.
    name: 'Customer',
    street1: '1 Infinite Loop',
    city: 'Cupertino',
    state: 'CA',
    zip: '95014',
    country: (country || 'US').toUpperCase(),
  }

  const parcel = {
    length: '12', width: '9', height: '0.5', distance_unit: 'in',
    weight: String(weightOz || 8), mass_unit: 'oz',
  }

  try {
    const res = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: { Authorization: `ShippoToken ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address_from: FROM_ADDRESS, address_to: to, parcels: [parcel], async: false }),
    })
    if (!res.ok) return MANUAL_SHIP_CENTS
    const data = await res.json()
    const rates = (data.rates || []).filter(r => r.amount && r.currency === 'USD')

    // For Issues category (magazines) shipped domestic US, prefer USPS Media Mail.
    if (isMedia && isUSPS(country)) {
      const media = rates.find(r => r.servicelevel?.token === 'usps_media_mail')
      if (media) return Math.round(Number(media.amount) * 100)
    }

    // Otherwise pick cheapest USPS or FedEx ground rate.
    const usps = rates.filter(r => r.provider === 'USPS' || r.provider === 'FedEx')
    const cheapest = (usps.length ? usps : rates).sort((a, b) => Number(a.amount) - Number(b.amount))[0]
    if (cheapest) return Math.round(Number(cheapest.amount) * 100)
  } catch {}
  return MANUAL_SHIP_CENTS
}

// Quote shipping for a cart to a destination country. Printify-fulfilled items
// get a live standard-shipping quote; self-fulfilled items get a live Shippo rate
// (or flat fallback) unless their subtotal meets the free-shipping threshold;
// external-link items are ignored.
// Returns { cents, printify, manualSubtotal, manualShipFree }.
export async function quoteCartShipping(db, items, country) {
  const ids = [...new Set((items || []).map(i => i.id).filter(id => UUID.test(id)))]
  if (!ids.length) return { cents: 0, printify: false, manualSubtotal: 0, manualShipFree: false }

  const { data: products } = await db.from('shop_products')
    .select('id, fulfillment, price, category, weight_oz, printify_product_id, printify_variant_id, variants')
    .in('id', ids).eq('active', true)
  const byId = new Map((products || []).map(p => [p.id, p]))

  // Collect single_pick IDs (inactive poster products) so we can look up their Printify data
  const pickIds = [...new Set((items || []).map(i => i.single_pick).filter(Boolean))]
  const pickById = new Map()
  if (pickIds.length) {
    const { data: picks } = await db.from('shop_products')
      .select('id, fulfillment, printify_product_id, printify_variant_id, variants')
      .in('id', pickIds)
    ;(picks || []).forEach(p => pickById.set(p.id, p))
  }

  const printifyLines = []
  let hasManual = false
  let manualSubtotal = 0
  let totalWeightOz = 0
  let allIssues = true
  for (const it of items) {
    const p = byId.get(it.id); if (!p) continue
    const qty = Math.max(1, Math.min(20, Number(it.qty) || 1))
    // For single_pick items, use the pick's Printify data for the shipping quote
    const pick = it.single_pick ? pickById.get(it.single_pick) : null
    const fulfillProduct = pick || p
    if (fulfillProduct.fulfillment === 'printify' && fulfillProduct.printify_product_id) {
      const vid = fulfillProduct.printify_variant_id || fulfillProduct.variants?.[0]?.printify_variant_id || it.printify_variant_id
      if (vid) printifyLines.push({ product_id: String(fulfillProduct.printify_product_id), variant_id: Number(vid), quantity: qty })
    } else if (fulfillProduct.fulfillment !== 'external') {
      hasManual = true
      manualSubtotal += Number(p.price || 0) * qty
      totalWeightOz += Number(p.weight_oz || 8) * qty
      if (p.category !== 'Issues') allIssues = false
    }
  }

  const manualShipFree = manualSubtotal >= MANUAL_FREE_SHIP_THRESHOLD

  let cents = 0
  if (printifyLines.length && printifyConfigured()) {
    try {
      const shopId = await resolveShopId()
      const res = await calcShipping(shopId, printifyLines, country || 'US')
      cents += res?.standard || 0
    } catch {
      cents += MANUAL_SHIP_CENTS
    }
  }
  if (hasManual && !manualShipFree) {
    cents += await quoteShippoRate(country, totalWeightOz, allIssues)
  }
  return { cents, printify: printifyLines.length > 0, manualSubtotal, manualShipFree }
}
