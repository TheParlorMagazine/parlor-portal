import { serviceClient } from '../../../../lib/apiAuth'
import { currencyForRequest, currencyForCountry, CURRENCY_SYMBOL } from '../../../../lib/geo'
import { quoteCartShipping } from '../../../../lib/shopShipping'

// POST { items, country } → live shipping quote for the cart to that country.
export async function POST(request) {
  let body = {}; try { body = await request.json() } catch {}
  const { items, country } = body
  if (!Array.isArray(items) || !items.length) return Response.json({ cents: 0 })
  const db = serviceClient()
  const quote = await quoteCartShipping(db, items, country)
  // Billing currency follows the visitor's region (not the ship-to country).
  const currency = currencyForRequest(request)
  return Response.json({
    cents: quote.cents,
    amount: +(quote.cents / 100).toFixed(2),
    currency,
    symbol: CURRENCY_SYMBOL[currency] || '$',
    printify: quote.printify,
  })
}
