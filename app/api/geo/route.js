import { currencyForRequest, countryFromRequest, CURRENCY_SYMBOL } from '../../../lib/geo'

// GET → the visitor's billing currency, for same-numeral geo pricing display.
export async function GET(request) {
  const currency = currencyForRequest(request)
  return Response.json({
    currency,
    symbol: CURRENCY_SYMBOL[currency] || '$',
    country: countryFromRequest(request) || null,
  })
}
