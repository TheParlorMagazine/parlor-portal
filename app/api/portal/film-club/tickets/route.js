import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { ticketAccessAvailable } from '../../../../../lib/filmTicketCommerce'
export async function GET(request) {
 const user=await requireUser(request)
 if(!user)return Response.json({error:'Sign in'},{status:401})
 const db=serviceClient()
 const {data,error}=await db.from('film_club_tickets').select('*,order:orders(order_number),screening:film_club_screenings(provider_authorized,viewing_start,viewing_end,forum_id,event:events(title))').eq('member_id',user.id).order('purchased_at',{ascending:false})
 if(error)return Response.json({error:'Could not load your screening tickets.'},{status:503})
 return Response.json({tickets:(data||[]).map(t=>({id:t.id,event_id:t.event_id,order_id:t.order_id,order_number:t.order?.order_number,title:t.screening.event.title,payment_status:t.payment_status,fulfillment_status:['access_assigned','access_sent'].includes(t.fulfillment_status)&&((t.access_expires_at&&Date.parse(t.access_expires_at)<=Date.now())||(t.screening.viewing_end&&Date.parse(t.screening.viewing_end)<=Date.now()))?'expired':t.fulfillment_status,amount_cents:t.amount_cents,currency:t.currency,refunded_cents:t.refunded_cents,purchased_at:t.purchased_at,viewing_start:t.screening.viewing_start,access_expires_at:t.access_expires_at || t.screening.viewing_end,...(ticketAccessAvailable(t,t.screening)?{viewing_url:t.viewing_url,instructions:t.instructions}:{}),forum_id:t.screening.forum_id}))},{headers:{'Cache-Control':'private, no-store'}})
}
