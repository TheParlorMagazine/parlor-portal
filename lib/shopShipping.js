import { shippingRegion } from './shippingRegion'
import { manualParcels } from './shopPackaging'
import { printifyConfigured, resolveShopId, calcShipping } from './printify'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Self-fulfilled orders over this threshold ship free (same-numeral: $100/£100/€100).
export const MANUAL_FREE_SHIP_THRESHOLD = 100

// FROM address — update to your actual fulfillment warehouse address.
const FROM_ADDRESS = {
  name: 'The Parlor Magazine',
  street1: process.env.SHIP_FROM_STREET || '123 Main St',
  city: process.env.SHIP_FROM_CITY || 'New York',
  state: shippingRegion(process.env.SHIP_FROM_STATE || 'NY', process.env.SHIP_FROM_COUNTRY || 'US'),
  zip: process.env.SHIP_FROM_ZIP || '10001',
  country: process.env.SHIP_FROM_COUNTRY || 'US',
}

// Country → Shippo-recognized country code mapping (already ISO-3166, so passthrough).
// Shippo uses USPS Media Mail for domestic US only; international falls back to Priority.
function isUSPS(country) { return (country || 'US').toUpperCase() === 'US' }

// Fetch a live Shippo rate for a manual shipment. Returns cents in the same-numeral
// model (i.e. the raw dollar amount × 100, without currency conversion — callers
// pass the display currency separately). Errors must not become invented shipping prices.
async function quoteShippoRate(country, parcels, isMedia, state, destination) {
  const token = process.env.SHIPPO_API_KEY
  if (!token || !['STREET', 'CITY', 'STATE', 'ZIP', 'COUNTRY'].every(key => process.env['SHIP_FROM_' + key])) throw new Error('Shipping is temporarily unavailable. Please contact us before ordering.')
  if (!destination?.line1?.trim() || !destination?.zip?.trim() || !destination?.city?.trim() || (isUSPS(country) && !state?.trim())) throw new Error('Complete your delivery address to calculate shipping.')

  const to = {
    // Minimum fields for a rate quote — no personal info needed.
    name: 'Customer',
    street1: destination.line1 || '',
    street2: destination.line2 || '',
    city: destination.city,
    state: shippingRegion(state, country),
    zip: destination.zip,
    country: (country || 'US').toUpperCase(),
  }


  let res, data
  try {
    res = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `ShippoToken ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address_from: FROM_ADDRESS, address_to: to, parcels, async: false }),
    })
    if (!res.ok) {
      console.error('Shippo shipping quote failed', { status: res.status })
    } else data = await res.json()
  } catch (error) {
    const timeout = error.name === 'TimeoutError' || error.name === 'AbortError'
    console.error('Shippo shipping quote failed', { reason: timeout ? 'timeout' : 'connection_or_response' })
    throw new Error(timeout ? 'The shipping service timed out. Please try again.' : 'Could not reach the shipping service. Please try again.')
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('The shipping provider could not authenticate the shop. Please contact us.')
    if (res.status === 400 || res.status === 422) throw new Error('The shipping provider rejected the shipment details. Please check your address or contact us.')
    throw new Error('The shipping service is temporarily unavailable. Please try again.')
  }
  if (!Array.isArray(data?.rates)) throw new Error('The shipping service returned an invalid quote. Please try again.')
  const rates = (data.rates || []).filter(r => r?.currency === 'USD' && Number.isFinite(Number(r.amount)) && Number(r.amount) > 0)

  // For Issues category (magazines) shipped domestic US, prefer USPS Media Mail.
  if (isMedia && isUSPS(country)) {
    const media = rates.find(r => r.servicelevel?.token === 'usps_media_mail')
    if (media) return Math.round(Number(media.amount) * 100)
  }

  // Otherwise pick cheapest USPS or FedEx ground rate.
  const usps = rates.filter(r => r.provider === 'USPS' || r.provider === 'FedEx')
  const cheapest = (usps.length ? usps : rates).sort((a, b) => Number(a.amount) - Number(b.amount))[0]
  if (cheapest) return Math.round(Number(cheapest.amount) * 100)
  console.error('Shippo shipping quote failed', { reason: 'no_usable_rates' })
  throw new Error('No shipping rate is available for this address. Please contact us.')
}

// Quote shipping for a cart to a destination country. Printify-fulfilled items
// get a live standard-shipping quote; self-fulfilled items get a live Shippo rate
// unless their subtotal meets the free-shipping threshold;
// external-link items are ignored.
// Returns { cents, printify, manualSubtotal, manualShipFree }.
export async function quoteCartShipping(db, items, country, state, resolvedProducts = null, destination = null) {
  const ids = [...new Set((items || []).map(i => i.id).filter(id => UUID.test(id)))]
  if (!ids.length) return { cents: 0, printify: false, manualSubtotal: 0, manualShipFree: false }

  const { data: products, error: productsError } = await db.from('shop_products')
    .select('id, fulfillment, price, category, weight_oz, packaging_size, printify_product_id, printify_variant_id, variants')
    .in('id', ids).eq('active', true)
  if (productsError && !resolvedProducts) throw new Error('Could not load shipping details. Please try again.')
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
  const manualLines = []
  let allIssues = true
  for (const it of items) {
    const p = it.resolvedProduct || resolvedProducts?.get(it.id) || byId.get(it.id); if (!p) throw new Error('A cart item is unavailable for shipping.')
    const qty = resolvedProducts ? Number(it.qty) : Math.max(1, Math.min(20, Number(it.qty) || 1))
    // For single_pick items, use the pick's Printify data for the shipping quote
    const pick = it.single_pick ? pickById.get(it.single_pick) : null
    const fulfillProduct = pick || p
    if (fulfillProduct.fulfillment === 'printify') {
      if (!fulfillProduct.printify_product_id) throw new Error('A Printify item is missing its shipping configuration.')
      const vid = it.printify_variant_id || fulfillProduct.printify_variant_id || fulfillProduct.variants?.[0]?.printify_variant_id
      const variant = fulfillProduct.variants?.find(v => String(v.printify_variant_id) === String(vid))
      if (!Number.isSafeInteger(Number(vid)) || Number(vid) < 1) throw new Error('A Printify variant is unavailable for shipping.')
      printifyLines.push({ product_id: String(variant?.printify_product_id || fulfillProduct.printify_product_id), variant_id: Number(vid), quantity: qty })
    } else if (fulfillProduct.fulfillment !== 'external') {
      hasManual = true
      manualSubtotal += Number(it.shippingUnitPrice ?? p.price ?? 0) * qty
      const weight = Number(p.weight_oz)
      if (!Number.isFinite(weight) || weight <= 0) throw new Error('An item is missing its shipping weight. Please contact us before ordering.')
      manualLines.push({ product: p, qty, separate: !!it.separatePackage })
      if (p.category !== 'Issues') allIssues = false
    }
  }

  const manualShipFree = manualSubtotal >= MANUAL_FREE_SHIP_THRESHOLD

  let cents = 0
  if (printifyLines.length) {
    if (!printifyConfigured()) throw new Error('Printify shipping is temporarily unavailable. Please try again.')
    try {
      const shopId = await resolveShopId()
      const res = await calcShipping(shopId, printifyLines, country || 'US', shippingRegion(state, country))
      if (!Number.isSafeInteger(res?.standard) || res.standard < 0) throw new Error('Invalid Printify rate')
      cents += res.standard
    } catch {
      throw new Error('Printify shipping rate unavailable. Please try again before ordering.')
    }
  }
  if (hasManual && !manualShipFree) {
    cents += await quoteShippoRate(country, manualParcels(manualLines), allIssues, state, destination)
  }
  return { cents, printify: printifyLines.length > 0, manualSubtotal, manualShipFree }
}
