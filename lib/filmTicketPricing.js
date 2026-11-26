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
  const feesByCurrency = {}
  for (const ticket of paid) {
    if (Number.isSafeInteger(ticket.stripe_processing_fee_cents) && ticket.stripe_fee_currency) feesByCurrency[ticket.stripe_fee_currency] = (feesByCurrency[ticket.stripe_fee_currency] || 0) + ticket.stripe_processing_fee_cents
  }
  const pendingFees = paid.filter(t => t.stripe_processing_fee_cents == null || !t.stripe_fee_currency).length
  // Do not mix Stripe settlement currencies or invent fees before a payment exists.
  const fee = countOverride != null ? null : paid.length === 0 ? 0 : pendingFees === 0 && paid.every(t => t.stripe_fee_currency === screening.currency) ? feesByCurrency[screening.currency] : null

  const acquisition = screening.acquisition_cost_cents == null ? null : count * screening.acquisition_cost_cents
  const potentialShare = acquisition == null ? null : Math.round(acquisition * screening.host_share_percent / 100)
  const other = config.other_cost_cents || 0
  const publicShare = screening.public_gross_cents == null ? null : Math.round(screening.public_gross_cents * screening.host_share_percent / 100)
  const base = acquisition == null || fee == null ? null : revenue - refunds - fee - acquisition - other
  return { count, revenue, refunds, stripeFees: fee, estimatedFees: fee, feesByCurrency, pendingFees, acquisition, publicShare, individualWithoutShare: base, individualWithShare: base == null ? null : base + potentialShare, privateLicense: screening.license_price_cents == null || fee == null ? null : revenue - refunds - fee - screening.license_price_cents - other, shareEligibility: screening.host_share_eligibility || 'unknown', reviewThreshold: screening.license_threshold }
}

// Actual receipts, not a projection from the currently configured ticket price.
export function filmRevenueTotals(screening, tickets = []) {
  const paid=tickets.filter(t=>['paid','partially_refunded','refunded','disputed'].includes(t.payment_status))
  const currencyMismatch=paid.some(t=>t.currency!==screening.currency)
  const stripeGross=paid.reduce((n,t)=>n+t.amount_cents,0)
  const refunds=paid.reduce((n,t)=>n+(t.refunded_cents || 0),0)
  const disputed=paid.filter(t=>t.payment_status==='disputed').reduce((n,t)=>n+t.amount_cents-(t.refunded_cents || 0),0)
  const externalGross=screening.public_gross_cents ?? (screening.public_tickets===0?0:null)
  const hostShare=screening.host_share_eligibility==='no'||externalGross===0?0:screening.host_share_eligibility==='yes'&&externalGross!=null?Math.round(externalGross*screening.host_share_percent/100):null
  const totalGross=externalGross==null||currencyMismatch?null:stripeGross+externalGross
  const retainedRevenue=hostShare==null||currencyMismatch?null:stripeGross-refunds-disputed+hostShare
  const feesByCurrency={}
  let pendingFees=0
  for(const t of paid){
    if(!Number.isSafeInteger(t.stripe_processing_fee_cents)||!t.stripe_fee_currency){pendingFees++;continue}
    feesByCurrency[t.stripe_fee_currency]=(feesByCurrency[t.stripe_fee_currency] || 0)+t.stripe_processing_fee_cents
  }
  const stripeFees=pendingFees||Object.keys(feesByCurrency).some(c=>c!==screening.currency)?null:feesByCurrency[screening.currency] || 0
  const acquisition=paid.length===0?0:screening.acquisition_cost_cents==null?null:paid.length*screening.acquisition_cost_cents
  const other=screening.ticket_settings?.other_cost_cents || 0
  return {stripeCount:paid.length,stripeGross:currencyMismatch?null:stripeGross,refunds:currencyMismatch?null:refunds,disputed:currencyMismatch?null:disputed,externalGross,totalGross,hostShare,retainedRevenue,feesByCurrency,pendingFees,stripeFees,acquisition,other,
    net:retainedRevenue==null||stripeFees==null||acquisition==null?null:retainedRevenue-stripeFees-acquisition-other,
    currencyMismatch,awaitingAccess:paid.filter(t=>['paid','partially_refunded'].includes(t.payment_status)&&t.fulfillment_status!=='access_sent').length,
    accessSent:paid.filter(t=>['paid','partially_refunded'].includes(t.payment_status)&&t.fulfillment_status==='access_sent').length,refundedCount:paid.filter(t=>t.refunded_cents>0).length}
}
