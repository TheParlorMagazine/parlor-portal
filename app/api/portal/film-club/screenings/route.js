import { filmSalesOpen } from '../../../../../lib/filmTicketLifecycle'
import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { filmEligible } from '../../../../../lib/filmTicketSettings'
import { ticketPricing } from '../../../../../lib/filmTicketPricing'
export async function GET(request) {
 const user=await requireUser(request),db=serviceClient()
 const {data,error}=await db.from('film_club_screenings').select('event_id,forum_id,trailer_url,ticket_url,ticket_price_cents,currency,member_discount_percent,member_price_override_cents,sales_enabled,stripe_archived,viewing_start,viewing_end,ticket_settings,event:events!inner(title,description,blurb,starts_at,ends_at,status,is_public,cover_image_url)').eq('event.status','published').eq('event.is_public',true)
 if(error)return Response.json({error:'Could not load screenings.'},{status:503})
 let eligible=false
 if(user){const {data:member,error}=await db.from('members').select('plan,subscription_status').eq('id',user.id).single();if(error)return Response.json({error:'Could not check membership.'},{status:503});eligible=filmEligible(member)}
 return Response.json({eligible,screenings:(data||[]).map(s=>{
  let pricing=null;try{pricing=ticketPricing(s)}catch{}
  const c=s.ticket_settings || {}
  return{event_id:s.event_id,forum_id:s.forum_id,event:s.event,trailer_url:s.trailer_url,ticket_url:s.ticket_url,pricing,provider:c.provider || 'External screening provider',format:c.format,synopsis:c.synopsis,filmmaker:c.filmmaker,runtime:c.runtime_minutes,language:c.language,subtitles:c.subtitles,qa:c.qa,refund_policy:'Refund requests are not available for screening tickets purchased through The Parlor.',refund_requests_allowed:false,viewing_start:s.viewing_start,viewing_end:s.viewing_end,sales_open:!!(filmSalesOpen(s)&&process.env.FILM_CLUB_TICKET_SALES_ENABLED==='true')}
 })},{headers:{'Cache-Control':'private, no-store'}})
}
