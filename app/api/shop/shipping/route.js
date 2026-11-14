import { prepareShopCart } from '../../../../lib/prepareShopCart'
import { serviceClient } from '../../../../lib/apiAuth'
import { currencyForRequest, CURRENCY_SYMBOL } from '../../../../lib/geo'
import { quoteCartShipping } from '../../../../lib/shopShipping'

// POST { items, country } → live shipping quote for the cart to that country.
export async function POST(request) {
  let body = {}; try { body = await request.json() } catch {}
  const { items, country, state, address } = body
  if (!Array.isArray(items) || !items.length) return Response.json({ cents: 0 })
  const db = serviceClient()
  const currency = currencyForRequest(request)
  const shipCountry = String(address?.country || country || 'US').toUpperCase()
  let prepared
  try { prepared = await prepareShopCart(db, items, currency, shipCountry) }
  catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
  let quote
  try {
  quote = await quoteCartShipping(db, prepared.shippingItems, shipCountry, address?.state || state, new Map(prepared.shippingItems.map(i => [i.id, i.resolvedProduct])), address)
  } catch (error) { return Response.json({ error: error.message }, { status: 422 }) }
  // Billing currency follows the visitor's region (not the ship-to country).
  return Response.json({
    cents: quote.cents,
    amount: +(quote.cents / 100).toFixed(2),
    currency,
    symbol: CURRENCY_SYMBOL[currency] || '$',
    printify: quote.printify,
    manualSubtotal: quote.manualSubtotal,
    manualShipFree: quote.manualShipFree,
  })
}
