// Detect the visitor's billing currency from the request, for geo-based pricing.
// Round per-currency amounts live on the product (price / price_eur / price_gbp);
// this only decides WHICH one to charge. Falls back to USD when unknown.

const EU = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
])

// Read the two-letter country code from whatever the host provides.
export function countryFromRequest(request) {
  const h = request.headers
  // Netlify
  const nfGeo = h.get('x-nf-geo')
  if (nfGeo) {
    try { const g = JSON.parse(Buffer.from(nfGeo, 'base64').toString('utf8')); if (g?.country?.code) return g.country.code.toUpperCase() } catch {}
  }
  return (
    h.get('x-country') ||
    h.get('x-vercel-ip-country') ||
    h.get('cf-ipcountry') ||
    ''
  ).toUpperCase() || null
}

export function currencyForCountry(country) {
  if (!country) return 'usd'
  if (country === 'GB') return 'gbp'
  if (EU.has(country)) return 'eur'
  return 'usd'
}

export function currencyForRequest(request) {
  return currencyForCountry(countryFromRequest(request))
}

export const CURRENCY_SYMBOL = { usd: '$', eur: '€', gbp: '£' }

// The retail amount to charge in the chosen currency, falling back to USD when a
// localized price hasn't been set on the product.
export function priceForCurrency(product, currency) {
  if (currency === 'eur' && product.price_eur != null) return Number(product.price_eur)
  if (currency === 'gbp' && product.price_gbp != null) return Number(product.price_gbp)
  return Number(product.price || 0)
}
