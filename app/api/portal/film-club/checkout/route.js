import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { ensureStripeCustomer } from '../../../../../lib/stripeCustomer'
import { createReservedCheckout } from '../../../../../lib/checkoutReservations'
import { checkoutOrigin } from '../../../../../lib/checkoutOrigin'
import { filmEligible } from '../../../../../lib/filmTicketSettings'
import { ticketPricing } from '../../../../../lib/filmTicketPricing'

export async function POST(request) {
 const user=await requireUser(request)
 if(!user || !user.email_confirmed_at)return Response.json({error:'Sign in with a verified account.'},{status:401})
 if(process.env.FILM_CLUB_TICKET_SALES_ENABLED!=='true')return Response.json({error:'Member ticket sales are not open yet.'},{status:503})
 if(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') && process.env.FILM_CLUB_LIVE_STRIPE_APPROVED!=='true')return Response.json({error:'Live screening ticket checkout is not activated.'},{status:503})
 const body=await request.json().catch(()=>({})),db=serviceClient()
 try{
  const [{data:member,error:memberError},{data:s,error:screeningError}]=await Promise.all([db.from('members').select('id,plan,subscription_status').eq('id',user.id).single(),db.from('film_club_screenings').select('*,event:events(title,status,is_public)').eq('event_id',body?.eventId).single()])
  if(memberError||screeningError)throw new Error('Could not load membership or screening.')
  if(!filmEligible(member))return Response.json({error:'An active Reader’s Circle or Printing Press membership is required.'},{status:403})
  if(!s.sales_enabled||!s.provider_authorized||s.stripe_archived||s.event.status!=='published'||!s.event.is_public||!s.sales_deadline||Date.parse(s.sales_deadline)<=Date.now()||s.stripe_synced_version!==s.pricing_version)throw new Error('Ticket sales are closed or pricing needs synchronization.')
  const quote=ticketPricing(s),stripe=new Stripe(process.env.STRIPE_SECRET_KEY)
  const price=await stripe.prices.retrieve(s.stripe_price_id)
  if(!price.active||price.recurring||price.currency!==quote.currency||price.unit_amount!==quote.member||price.product!==s.stripe_product_id)throw new Error('Ticket pricing is unavailable.')
  const customer=await ensureStripeCustomer(db,stripe,user.id)
  if(!customer)throw new Error('Could not link your billing account.')
  const origin=checkoutOrigin(request)
  const params={mode:'payment',customer,currency:quote.currency,line_items:[{price:s.stripe_price_id,quantity:1}],client_reference_id:user.id,success_url:`${origin}/portal/film-club?checkout=returned`,cancel_url:`${origin}/portal/film-club`,metadata:{kind:'film_screening_ticket',userId:user.id,screening_id:s.event_id,event_id:s.event_id,price_id:s.stripe_price_id,amount_cents:String(quote.member),shop_product_id:s.shop_product_id,product_name:`Film Club — ${s.event.title}`,eligible_plan:member.plan,eligible_status:member.subscription_status}}
  const session=await createReservedCheckout({db,stripe,userId:user.id,requestId:body.requestId,kind:'film_screening_ticket',resource:`film:${s.event_id}`,params})
  return Response.json(session,{headers:{'Cache-Control':'no-store'}})
 }catch(error){return Response.json({error:error.message},{status:409})}
}
