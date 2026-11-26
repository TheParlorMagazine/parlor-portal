import { currencyForRequest, countryFromRequest, CURRENCY_SYMBOL, analyticsConsentRequired } from '../../../lib/geo'

// GET → the visitor's billing currency, for same-numeral geo pricing display.
export async function GET(request) {
  const currency = currencyForRequest(request)
  return Response.json({
    consentRequired: analyticsConsentRequired(countryFromRequest(request)),
    currency,
    symbol: CURRENCY_SYMBOL[currency] || '$',
    country: countryFromRequest(request) || null,
  }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'x-nf-geo, x-country, x-vercel-ip-country, cf-ipcountry' } })
}
