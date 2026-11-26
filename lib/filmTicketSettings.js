import { ticketPricing } from './filmTicketPricing'
export function validateFilmSettings(body) {
  const p = { ...body }
  // New edits always derive the member price from the ticket price and discount.
  p.member_price_override_cents=null
  ticketPricing(p)
  for (const key of ['member_ticket_limit','acquisition_cost_cents','license_price_cents','license_threshold']) {
    if (p[key] != null && (!Number.isSafeInteger(p[key]) || p[key] < (['member_ticket_limit','license_threshold'].includes(key) ? 1 : 0) || p[key]>100000000)) throw new Error(`Invalid ${key}.`)
  }
  if (!Number.isFinite(p.host_share_percent) || p.host_share_percent<0 || p.host_share_percent>100 || !['unknown','yes','no'].includes(p.host_share_eligibility)) throw new Error('Invalid host revenue share.')
  if(!p.event || typeof p.event.title!=='string' || !p.event.title.trim() || p.event.title.length>200 || !['draft','published','cancelled'].includes(p.event.status)||!Number.isFinite(Date.parse(p.event.starts_at)))throw new Error('Enter event title, publication status and start date.')
  if(p.event.ends_at&&(!Number.isFinite(Date.parse(p.event.ends_at))||Date.parse(p.event.ends_at)<=Date.parse(p.event.starts_at)))throw new Error('Event end must follow its start.')
  if(p.event.capacity!=null&&(!Number.isSafeInteger(p.event.capacity)||p.event.capacity<1))throw new Error('Invalid audience capacity.')
  if(p.ticket_url){const url=new URL(p.ticket_url);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS public ticket purchase URL.')}
  const c={...p.ticket_settings,language:p.ticket_settings?.language || 'English'}
  p.ticket_settings=c
  for(const key of ['provider','filmmaker','synopsis','language','subtitles','qa','instructions','authorization_note','refund_policy']) if(c[key]!=null && (typeof c[key]!=='string'||c[key].length>5000))throw new Error(`Invalid ${key}.`)
  if(!['live','flex'].includes(c.format)||!['individual','provider_link','private_license','other'].includes(c.fulfillment_method))throw new Error('Choose the screening format and fulfillment method.')

  for(const key of ['runtime_minutes','stripe_fee_fixed_cents','other_cost_cents'])if(c[key]!=null&&(!Number.isSafeInteger(c[key])||c[key]<(key==='runtime_minutes'?1:0)))throw new Error(`Invalid ${key}.`)

  p.sales_deadline=p.event.starts_at
  if(c.format==='live'){p.viewing_start=p.event.starts_at;p.viewing_end=p.event.ends_at || null}
  for(const key of ['viewing_start','viewing_end'])if(p[key]&&!Number.isFinite(Date.parse(p[key])))throw new Error('Enter valid viewing dates.')
  if(p.viewing_start&&p.viewing_end&&Date.parse(p.viewing_end)<=Date.parse(p.viewing_start))throw new Error('Viewing end must follow viewing start.')
  return p
}
export function filmEligible(member) {
  return /reader|circle|printing|press/i.test(member?.plan || '') && ['active','trialing'].includes(String(member?.subscription_status || '').toLowerCase())
}
