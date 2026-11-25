// Shared by admin preview and server validation; all monetary inputs are minor units.
export const FILM_CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy']
export const currencyExponent = currency => currency === 'jpy' ? 0 : 2
export function ticketPricing(screening) {
  const currency = screening.currency
  const standard = screening.ticket_price_cents
  const percent = Number(screening.member_discount_percent)
  const override = screening.member_price_override_cents
  if (!FILM_CURRENCIES.includes(currency) || !Number.isSafeInteger(standard) || standard < 1 || standard > 100000000 || !Number.isFinite(percent) || percent < 0 || percent > 100 || Math.abs(Math.round(percent * 100) - percent * 100) > 0.000001) throw new Error('Enter a supported currency, positive public price and a discount from 0 to 100%.')
  const member = override == null ? Math.round(standard * (10000 - Math.round(percent * 100)) / 10000) : override
  if (!Number.isSafeInteger(member) || member < 1 || member > standard) throw new Error('Member price must be positive and no greater than the public price.')
  return { currency, standard, member, percent, savings: standard - member }
}
export function filmMoney(amount, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 10 ** currencyExponent(currency))
}
export function filmProfitability(screening, tickets = [], countOverride = null) {
  const pricing = ticketPricing(screening)
  const config = screening.ticket_settings || {}
  const paid = tickets.filter(t => ['paid','partially_refunded','refunded','disputed'].includes(t.payment_status))
  const count = countOverride ?? paid.length
  const revenue = countOverride == null ? paid.reduce((sum,t) => sum + t.amount_cents,0) : count * pricing.member
  const refunds = countOverride == null ? paid.reduce((sum,t) => sum + t.refunded_cents,0) : 0
  const fee = config.stripe_fee_percent == null || config.stripe_fee_fixed_cents == null ? null : Math.round(revenue * config.stripe_fee_percent / 100) + count * config.stripe_fee_fixed_cents
  const acquisition = screening.acquisition_cost_cents == null ? null : count * screening.acquisition_cost_cents
  const potentialShare = acquisition == null ? null : Math.round(acquisition * screening.host_share_percent / 100)
  const other = config.other_cost_cents || 0
  const publicShare = screening.public_gross_cents == null ? null : Math.round(screening.public_gross_cents * screening.host_share_percent / 100)
  const base = acquisition == null || fee == null ? null : revenue - refunds - fee - acquisition - other
  return { count, revenue, refunds, estimatedFees: fee, acquisition, publicShare, individualWithoutShare: base, individualWithShare: base == null ? null : base + potentialShare, privateLicense: screening.license_price_cents == null || fee == null ? null : revenue - refunds - fee - screening.license_price_cents - other, shareEligibility: screening.host_share_eligibility || 'unknown', reviewThreshold: screening.license_threshold }
}
