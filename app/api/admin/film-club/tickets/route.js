import { filmRevenueReport, filmRevenueDashboard } from '../../../../../lib/filmRevenueReport'
import Stripe from 'stripe'
import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { refreshFilmPayment, sendFilmEmail } from '../../../../../lib/filmTicketCommerce'
import { refundScreeningOrder } from '../../../../../lib/subscriberActions'
async function gate(request) {
 const user=await requireUser(request)
 if(!user)return{error:Response.json({error:'Sign in'},{status:401})}
 const db=serviceClient(),member=await memberOf(db,user.id)
 if(!['admin','editor','finance_admin'].includes(member.role))return{error:Response.json({error:'Forbidden'},{status:403})}
 return{db,user,role:member.role}
}
const csvCell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"'
export async function GET(request) {
 const {db,error}=await gate(request);if(error)return error
 const url=new URL(request.url),eventId=url.searchParams.get('eventId')
 if(url.searchParams.get('overview')==='true'){
  try{return Response.json(eventId?{totals:await filmRevenueReport(db,eventId)}:{dashboard:await filmRevenueDashboard(db)},{headers:{'Cache-Control':'private, no-store'}})}
  catch(error){return Response.json({error:error.message},{status:503})}
 }
 const data=[]
 for(let offset=0;offset<5000;offset+=500){
  let q=db.from('film_club_tickets').select('*,member:members(full_name,email),order:orders(order_number,stripe_payment_intent),screening:film_club_screenings(event:events(title))').order('purchased_at',{ascending:false}).order('id')
  if(eventId)q=q.eq('event_id',eventId)
  const {data:page,error:loadError}=await q.range(offset,offset+499)
  if(loadError)return Response.json({error:'Could not load tickets.'},{status:503})
  data.push(...page)
  if(page.length<500)break
 }
 const safe=(data||[]).map(({viewing_url,instructions,...t})=>t)
 if(url.searchParams.get('format')==='csv'){
  const keys=['Member','Email','Screening','Eligibility','Purchased','Price minor units','Currency','Order','Payment','Fulfillment','Email status']
  const rows=safe.map(t=>[t.member?.full_name,t.member?.email,t.screening?.event?.title,t.eligibility?.plan,t.purchased_at,t.amount_cents,t.currency,t.order?.order_number,t.payment_status,t.fulfillment_status,t.access_email_status])
  return new Response([keys,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="film-tickets.csv"','Cache-Control':'private, no-store'}})
 }
 const {data:audit,error:auditError}=await db.from('film_club_ticket_audit').select('ticket_id,actor_id,action,detail,created_at').eq('event_id',eventId).order('created_at',{ascending:false}).limit(500)
 if(auditError)return Response.json({error:'Could not load ticket audit history.'},{status:503})
 return Response.json({tickets:safe,audit,truncated:safe.length===5000},{headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(request) {
 const {db,user,role,error}=await gate(request);if(error)return error
 const body=await request.json().catch(()=>({}))
 try{
  if(body.action==='bulk'){
   if(role==='finance_admin')return Response.json({error:'Forbidden'},{status:403})
   if(!Array.isArray(body.ticketIds)||!body.ticketIds.length||body.ticketIds.length>100)throw new Error('Choose 1–100 tickets for bulk fulfillment.')
   const {data:screening,error}=await db.from('film_club_screenings').select('provider_authorized,ticket_settings').eq('event_id',body.eventId).single()
   if(error||!screening)throw new Error('Screening unavailable.')
   const p=body.patch || {}
   if(p.fulfillment_status!=='access_assigned'||!p.viewing_url)throw new Error('Bulk fulfillment must assign authorized access.')
   const url=new URL(p.viewing_url)
   if(url.protocol!=='https:'||url.username||url.password)throw new Error('Enter an HTTPS viewing URL.')
   if(p.access_expires_at&&!Number.isFinite(Date.parse(p.access_expires_at)))throw new Error('Invalid expiration.')
   for(const key of ['instructions','fulfillment_notes'])if(p[key]!=null&&(typeof p[key]!=='string'||p[key].length>10000))throw new Error('Instructions or notes are too long.')
   let saved=0
   for(const id of [...new Set(body.ticketIds)]){
    const {data:t,error}=await db.from('film_club_tickets').select('id,event_id').eq('id',id).eq('event_id',body.eventId).single()
    if(error||!t)throw new Error(`${saved} tickets saved; remaining selection could not be validated.`)
    const {error:updateError}=await db.rpc('update_film_ticket',{p_ticket:t.id,p_actor:user.id,p_action:'fulfillment',p_patch:p})
    if(updateError)throw new Error(`${saved} tickets saved; remaining tickets need review.`)
    saved++
   }
   return Response.json({ok:true,saved})
  }
  const {data:ticket,error}=await db.from('film_club_tickets').select('*').eq('id',body.ticketId).single()
  if(error||!ticket)throw new Error('Ticket unavailable.')
  if(body.action==='refund'){
   if(!['admin','finance_admin'].includes(role))return Response.json({error:'Refunds require administrator or finance access.'},{status:403})
   if(!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')&&process.env.FILM_CLUB_LIVE_STRIPE_APPROVED!=='true')throw new Error('Live Film Club Stripe changes have not been activated.')
   const stripe=new Stripe(process.env.STRIPE_SECRET_KEY)
   const refund=await refundScreeningOrder(db,stripe,user,body)
   const updated=await refreshFilmPayment(db,stripe,ticket)
   const {error:auditError}=await db.from('film_club_ticket_audit').insert({event_id:ticket.event_id,ticket_id:ticket.id,actor_id:user.id,action:'refund_requested',detail:{refund_id:refund.id,operation_id:body.operationId}})
   if(auditError)throw new Error('Refund submitted; audit needs recovery. Retry with the same operation ID.')
   if(updated.refunded_cents>0)await sendFilmEmail(db,updated,'refund',`refund-${ticket.id}-${updated.refunded_cents}`)
   return Response.json({refund:{id:refund.id,status:refund.status}})
  }
  if(role==='finance_admin')return Response.json({error:'Fulfillment requires administrator or editor access.'},{status:403})
  if(body.action==='fulfillment'){
   const p=body.patch || {}
   if(!['awaiting_access','external_ticket_purchased','private_license_selected','access_assigned','cancelled','expired','failed'].includes(p.fulfillment_status))throw new Error('Choose a fulfillment status.')
   if(p.viewing_url){const url=new URL(p.viewing_url);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Enter a secure provider viewing URL.')}
   if(p.fulfillment_status==='access_assigned'&&!(p.viewing_url || (!('viewing_url' in p)&&ticket.viewing_url)))throw new Error('Assign a viewing URL first.')
   for(const key of ['instructions','fulfillment_notes'])if(p[key]!=null&&(typeof p[key]!=='string'||p[key].length>10000))throw new Error('Instructions or notes are too long.')
   if(p.access_expires_at&&!Number.isFinite(Date.parse(p.access_expires_at)))throw new Error('Enter a valid access expiration.')
   const {error}=await db.rpc('update_film_ticket',{p_ticket:ticket.id,p_actor:user.id,p_action:'fulfillment',p_patch:p})
   if(error)throw new Error('Could not save authorized ticket fulfillment.')
   return Response.json({ok:true})
  }
  if(['send','remind'].includes(body.action)){
   const purpose=body.action==='send'?'access':'reminder'
   const key=purpose==='access'?`access-${ticket.id}-${ticket.access_version}`:`reminder-${ticket.id}-${ticket.access_version}-${new Date().toISOString().slice(0,10)}`
   const result=await sendFilmEmail(db,ticket,purpose,key)
   const {error}=await db.from('film_club_ticket_audit').insert({event_id:ticket.event_id,ticket_id:ticket.id,actor_id:user.id,action:`email_${purpose}`,detail:{key,status:result.trackingStatus || result.reason}})
   if(error)throw new Error('Email tracking audit needs retry.')
   return Response.json({ok:true,status:result.trackingStatus || result.reason})
  }
  throw new Error('Choose a supported action.')
 }catch(error){return Response.json({error:error.message},{status:409})}
}
