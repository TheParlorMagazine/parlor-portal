import { ticketPricing } from './filmTicketPricing'
export function validateFilmSettings(body) {
  const p = { ...body }
  ticketPricing(p)
  for (const key of ['member_ticket_limit','acquisition_cost_cents','license_price_cents','license_threshold']) {
    if (p[key] != null && (!Number.isSafeInteger(p[key]) || p[key] < (['member_ticket_limit','license_threshold'].includes(key) ? 1 : 0) || p[key]>100000000)) throw new Error(`Invalid ${key}.`)
  }
  if (!Number.isFinite(p.host_share_percent) || p.host_share_percent<0 || p.host_share_percent>100 || !['unknown','yes','no'].includes(p.host_share_eligibility)) throw new Error('Invalid host revenue share.')
  for (const key of ['sales_deadline','viewing_start','viewing_end']) if(p[key] && !Number.isFinite(Date.parse(p[key]))) throw new Error('Enter valid sales and viewing dates.')
  if (p.viewing_start && p.viewing_end && Date.parse(p.viewing_end)<=Date.parse(p.viewing_start)) throw new Error('Viewing end must follow viewing start.')
  if(p.sales_deadline&&p.viewing_end&&Date.parse(p.sales_deadline)>Date.parse(p.viewing_end))throw new Error('Ticket sales must close by the viewing deadline.')
  if(typeof p.provider_authorized!=='boolean') throw new Error('Confirm whether provider authorization has been obtained.')
  if(!p.event || typeof p.event.title!=='string' || !p.event.title.trim() || p.event.title.length>200 || !['draft','published','cancelled'].includes(p.event.status)||!Number.isFinite(Date.parse(p.event.starts_at)))throw new Error('Enter event title, publication status and start date.')
  if(p.event.ends_at&&(!Number.isFinite(Date.parse(p.event.ends_at))||Date.parse(p.event.ends_at)<=Date.parse(p.event.starts_at)))throw new Error('Event end must follow its start.')
  if(p.event.capacity!=null&&(!Number.isSafeInteger(p.event.capacity)||p.event.capacity<1))throw new Error('Invalid audience capacity.')
  if(p.ticket_url){const url=new URL(p.ticket_url);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS public ticket purchase URL.')}
  const c=p.ticket_settings || {}
  for(const key of ['provider','filmmaker','synopsis','language','subtitles','qa','instructions','authorization_note','refund_policy']) if(c[key]!=null && (typeof c[key]!=='string'||c[key].length>5000))throw new Error(`Invalid ${key}.`)
  if(!['live','flex'].includes(c.format)||!['individual','provider_link','private_license','other'].includes(c.fulfillment_method))throw new Error('Choose the screening format and fulfillment method.')
  if(p.provider_authorized&&!c.authorization_note?.trim())throw new Error('Record the authorized provider arrangement.')
  for(const key of ['runtime_minutes','stripe_fee_fixed_cents','other_cost_cents'])if(c[key]!=null&&(!Number.isSafeInteger(c[key])||c[key]<0))throw new Error(`Invalid ${key}.`)
  if(c.stripe_fee_percent!=null&&(!Number.isFinite(c.stripe_fee_percent)||c.stripe_fee_percent<0||c.stripe_fee_percent>100))throw new Error('Invalid processing fee estimate.')
  return p
}
export function filmEligible(member) {
  return /reader|circle|printing|press/i.test(member?.plan || '') && ['active','trialing'].includes(String(member?.subscription_status || '').toLowerCase())
}
