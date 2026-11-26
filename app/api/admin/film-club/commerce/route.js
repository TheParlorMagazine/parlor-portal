import { archiveFilmProduct, filmHasEnded } from '../../../../../lib/filmTicketLifecycle'
import Stripe from 'stripe'
import { requireUser, memberOf, serviceClient } from '../../../../../lib/apiAuth'
import { saveFilmTicketWorkflow } from '../../../../../lib/filmTicketWorkflow'
import { synchronizeFilmProduct } from '../../../../../lib/filmTicketCommerce'
export async function POST(request) {
 const user=await requireUser(request)
 if(!user)return Response.json({error:'Sign in'},{status:401})
 const db=serviceClient(),member=await memberOf(db,user.id)
 if(!['admin','editor'].includes(member.role))return Response.json({error:'Forbidden'},{status:403})
 const body=await request.json().catch(()=>({}))
 try{
  const {data:s,error}=await db.from('film_club_screenings').select('*,event:events(title,status,is_public,starts_at,ends_at)').eq('event_id',body.eventId).single()
  if(error||!s)throw new Error('Screening unavailable.')
  const stripeFactory=()=>{
   if(!process.env.STRIPE_SECRET_KEY)throw Error('Stripe is not configured for this deployment.')
   if(!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')&&process.env.FILM_CLUB_LIVE_STRIPE_APPROVED!=='true')throw Error('Live Film Club Stripe changes are not activated. Configure test mode or activate the live integration.')
   return new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  if(['settings','publish'].includes(body.action))return Response.json(await saveFilmTicketWorkflow({db,screening:s,settings:body.settings,actor:user.id,publish:body.action==='publish',stripeFactory,salesEnabled:process.env.FILM_CLUB_TICKET_SALES_ENABLED==='true'}))
  if(body.action==='pause'){
   const {error}=await db.rpc('set_film_ticket_sales',{p_event:s.event_id,p_actor:user.id,p_enabled:false})
   if(error)throw Error('Ticket sales could not be paused. Retry Pause sales.')
   return Response.json({ok:true,message:'Ticket sales paused.'})
  }
  if(body.action==='sales'){
   if(typeof body.enabled!=='boolean')throw new Error('Choose whether sales are enabled.')
   if(body.enabled){if(process.env.FILM_CLUB_TICKET_SALES_ENABLED!=='true')throw Error('Ticket checkout is disabled for this deployment.');stripeFactory()}
   const {error}=await db.rpc('set_film_ticket_sales',{p_event:s.event_id,p_actor:user.id,p_enabled:body.enabled})
   if(error)throw new Error('Sales need a published upcoming screening and synchronized pricing.')
   return Response.json({ok:true})
  }
  if(!['sync','archive'].includes(body.action))throw new Error('Choose a supported action.')
  if(body.action==='sync')return Response.json(await synchronizeFilmProduct(db,stripeFactory(),s))
  if(!filmHasEnded(s))throw Error('Ticket products can only be archived after the event ends.')
  if(!s.stripe_product_id)throw Error('This screening has no Stripe ticket product.')
  if(s.stripe_archived)return Response.json({ok:true,message:'Ticket product already archived.'})
  await archiveFilmProduct(db,stripeFactory(),s)
  return Response.json({ok:true,message:'Ticket product archived.'})
 }catch(error){return Response.json({error:error.message,saved:error.saved===true},{status:409})}
}
