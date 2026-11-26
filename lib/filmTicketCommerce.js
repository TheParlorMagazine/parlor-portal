import { syncFilmTicketFee } from './filmTicketFees'
import { filmHasEnded } from './filmTicketLifecycle'
import { serviceClient } from './apiAuth'
import { ticketPricing } from './filmTicketPricing'
import { sendStripeEmailOnce } from './stripeEmail'
import { deliver } from './sendEmail'
import { renderDefaultEmail } from './emails'
import { filmMoney } from './filmTicketPricing'

const receipt = 'Your ticket purchase is confirmed. You will receive your viewing link and screening instructions shortly.'
export async function synchronizeFilmProduct(db,stripe,screening) {
  if(filmHasEnded(screening))throw new Error('This screening has ended. Its ticket product stays archived.')
  const price=ticketPricing(screening)
  const {data:op,error}=await db.from('film_club_stripe_operations').upsert({event_id:screening.event_id,version:screening.pricing_version,snapshot:{...price,title:screening.event.title}},{onConflict:'event_id,version',ignoreDuplicates:true}).select().maybeSingle()
  if(error)throw new Error('Could not save the synchronization operation.')
  const operation=op || (await db.from('film_club_stripe_operations').select('*').eq('event_id',screening.event_id).eq('version',screening.pricing_version).single()).data
  if(!operation)throw new Error('Synchronization is unavailable.')
  const productId=`parlor_film_${screening.event_id.replaceAll('-','')}`
  const metadata={screening_id:screening.event_id,event_id:screening.event_id,product_type:'film_screening_ticket',ticket_type:'readers_circle_member',application:'parlor_film_club'}
  let product
  try{product=await stripe.products.retrieve(productId)}catch(error){if(error.statusCode!==404)throw error}
  if(!product)product=await stripe.products.create({id:productId,name:`The Parlor Film Club — ${operation.snapshot.title} — Member Ticket`,metadata},{idempotencyKey:`film-product-${screening.event_id}`})
  if(product.deleted)throw new Error('The ticket product was deleted. Review Stripe before continuing.')
  if(product.metadata?.screening_id!==screening.event_id)throw new Error('Stripe product metadata does not match this screening.')
  await stripe.products.update(productId,{active:true,name:`The Parlor Film Club — ${operation.snapshot.title} — Member Ticket`})
  let stripePrice
  // Recover even after Stripe's idempotency window: operation metadata is durable.
  for await(const p of stripe.prices.list({product:productId,limit:100}))if(p.metadata?.operation_id===operation.id){stripePrice=p;break}
  if(!stripePrice)stripePrice=await stripe.prices.create({product:productId,currency:operation.snapshot.currency,unit_amount:operation.snapshot.member,metadata:{...metadata,operation_id:operation.id}},{idempotencyKey:`film-price-${operation.id}`})
  if(stripePrice.unit_amount!==operation.snapshot.member||stripePrice.currency!==operation.snapshot.currency)throw new Error('Stripe pricing does not match this operation.')
  if(stripePrice.active===false)await stripe.prices.update(stripePrice.id,{active:true})
  const {error:saveError}=await db.rpc('finish_film_price_sync',{p_event:screening.event_id,p_version:screening.pricing_version,p_product:productId,p_price:stripePrice.id})
  if(saveError)throw new Error('Stripe pricing was created but could not be linked. Retry synchronization; do not create another product.')
  if(screening.stripe_price_id && screening.stripe_price_id!==stripePrice.id)await stripe.prices.update(screening.stripe_price_id,{active:false})
  return{productId,priceId:stripePrice.id}
}
export async function fulfillFilmTicket(stripe, supplied) {
  const session=await stripe.checkout.sessions.retrieve(supplied.id)
  if(session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid')return null
  if(session.metadata?.kind!=='film_screening_ticket')throw new Error('Not a screening checkout.')
  const db=serviceClient()
  const {data:reservation,error}=await db.from('checkout_reservations').select('*').eq('id',session.metadata.reservation_id).single()
  if(error||!reservation||reservation.kind!=='film_screening_ticket'||reservation.member_id!==session.client_reference_id||session.metadata.userId!==reservation.member_id||session.currency!==reservation.stripe_params.currency||session.amount_total!==Number(reservation.stripe_params.metadata.amount_cents))throw new Error('Screening checkout identity or amount mismatch.')
  const {error:observeError}=await db.rpc('observe_checkout',{p_id:reservation.id,p_session:session.id,p_state:'paid'})
  if(observeError)throw new Error('Could not confirm ticket allocation.')
  const {data:ticket,error:ticketError}=await db.rpc('record_paid_film_ticket',{p_reservation:reservation.id,p_session:session.id,p_payment:typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id,p_amount:session.amount_total,p_currency:session.currency,p_email:session.customer_details?.email || session.customer_email})
  if(ticketError)throw new Error('Could not save the paid ticket. Payment must not be repeated.')
  // Reconcile refund/dispute state before retrying a receipt; payment history is never downgraded by a duplicate checkout event.
  const current=await refreshFilmPayment(db,stripe,ticket)
  await sendFilmEmail(db,current,'purchase',`purchase-${ticket.id}`)
  if(current.refunded_cents>0)await sendFilmEmail(db,current,'refund',`refund-${ticket.id}-${current.refunded_cents}`)
  return ticket
}
export async function refreshFilmPayment(db,stripe,ticket) {
  const {data:order,error}=await db.from('orders').select('*').eq('id',ticket.order_id).single()
  if(error||!order?.stripe_payment_intent)throw new Error('Ticket payment reference unavailable.')
  const pi=await stripe.paymentIntents.retrieve(order.stripe_payment_intent,{expand:['latest_charge.balance_transaction']})
  const charge=typeof pi.latest_charge==='string'?await stripe.charges.retrieve(pi.latest_charge):pi.latest_charge
  if(!charge)throw new Error('Ticket payment charge unavailable.')
  let disputed=!!charge.disputed
  if(disputed){const disputes=await stripe.disputes.list({charge:charge.id,limit:100});disputed=disputes.data.some(d=>!['won','warning_closed'].includes(d.status))}
  const status=disputed?'disputed':charge.amount_refunded>=charge.amount?'refunded':charge.amount_refunded>0?'partially_refunded':'paid'
  const {data,error:updateError}=await db.rpc('update_film_ticket',{p_ticket:ticket.id,p_actor:null,p_action:'payment',p_patch:{payment_status:status,refunded_cents:charge.amount_refunded || 0}})
  if(updateError)throw new Error('Could not refresh ticket payment status.')
  await syncFilmTicketFee(db,stripe,ticket,charge)
  return data
}
export async function handleFilmPaymentEvent(db,stripe,object) {
  const payment=typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent?.id
  if(!payment)return
  const {data:orders,error}=await db.from('orders').select('id').eq('stripe_payment_intent',payment).eq('metadata->>kind','film_screening_ticket')
  if(error)throw new Error('Could not locate screening order.')
  for(const order of orders || []){
    const {data:ticket,error}=await db.from('film_club_tickets').select('*').eq('order_id',order.id).single()
    if(error)throw new Error('Could not locate screening ticket.')
    const updated=await refreshFilmPayment(db,stripe,ticket)
    if(updated.refunded_cents>ticket.refunded_cents)await sendFilmEmail(db,updated,'refund',`refund-${updated.id}-${updated.refunded_cents}`)
  }
}
export function ticketAccessAvailable(ticket,screening,now=Date.now()) {
  return screening.event?.status!=='cancelled'&&['paid','partially_refunded'].includes(ticket.payment_status)&&['access_assigned','access_sent'].includes(ticket.fulfillment_status)&&!!ticket.viewing_url&&(!screening.viewing_start||Date.parse(screening.viewing_start)<=now)&&(!ticket.access_expires_at||Date.parse(ticket.access_expires_at)>now)&&(!screening.viewing_end||Date.parse(screening.viewing_end)>now)
}
export async function sendFilmEmail(db,ticket,purpose,key) {
  const [{data:member},{data:screening}]=await Promise.all([db.from('members').select('email,full_name').eq('id',ticket.member_id).single(),db.from('film_club_screenings').select('*,event:events(title,starts_at,status)').eq('event_id',ticket.event_id).single()])
  if(!member?.email||!screening)throw new Error('Email recipient or screening unavailable.')
  if(['access','reminder'].includes(purpose)&&screening.event?.status==='cancelled')throw new Error('Viewing access cannot be sent for a cancelled screening.')
  if(['access','reminder'].includes(purpose)&&!ticketAccessAvailable(ticket,{...screening,viewing_start:null}))throw new Error('Assign a paid ticket’s viewing link before sending; expired access cannot be sent.')
  if(purpose==='purchase'&&!['paid','partially_refunded'].includes(ticket.payment_status))return {skipped:true}
  const site=(process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com').replace(/\/$/,'')
  const vars={name:member.full_name || 'Reader',filmTitle:screening.event.title,amount:filmMoney(purpose==='refund'?ticket.refunded_cents:ticket.amount_cents,ticket.currency),when:screening.viewing_start || screening.event.starts_at || 'To be announced',expires:ticket.access_expires_at || screening.viewing_end || 'See viewing instructions',viewingUrl:ticket.viewing_url,instructions:ticket.instructions || '',qa:screening.ticket_settings?.qa || '',forumUrl:screening.forum_id?`${site}/portal/forums/${screening.forum_id}`:`${site}/portal/film-club`}
  const type=`film_ticket_${purpose}`
  const subject=purpose==='purchase'?'Your Film Club ticket is confirmed':purpose==='refund'?'Your Film Club refund confirmation':purpose==='reminder'?`Screening reminder: ${vars.filmTitle}`:`Your viewing link for ${vars.filmTitle}`
  const result=await sendStripeEmailOnce({eventId:key,type,to:member.email,send:()=>deliver({type,to:member.email,subject,html:renderDefaultEmail(type,vars),vars:Object.fromEntries(Object.entries(vars).map(([k,v])=>[k,String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))])),idempotencyKey:key,critical:true})})
  if(purpose==='purchase'){
    const {error}=await db.from('film_club_tickets').update({purchase_email_status:result?.trackingStatus || result?.reason || 'uncertain'}).eq('id',ticket.id)
    if(error)throw new Error('Purchase email status could not be saved.')
  }
  if(purpose==='access'){
    let accepted=result?.trackingStatus==='accepted'
    if(result?.reason==='already_claimed'){const {data}=await db.from('stripe_email_deliveries').select('status').eq('stripe_event_id',key).eq('email_type',type).eq('recipient',member.email.trim().toLowerCase()).maybeSingle();accepted=data?.status==='accepted'}
    const {error}=await db.from('film_club_tickets').update({access_email_status:accepted?'accepted':result?.trackingStatus || result?.reason || 'uncertain',...(accepted?{fulfillment_status:'access_sent'}:{})}).eq('id',ticket.id).eq('access_version',ticket.access_version)
    if(error)throw new Error('Email status could not be saved.')
  }
  return result
}

export async function deliverFilmTicketReminders(db) {
  const tickets=[],snapshot=new Date().toISOString()
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from('film_club_tickets').select('*,screening:film_club_screenings(viewing_end,ticket_settings,event:events(starts_at,status))').in('payment_status',['paid','partially_refunded']).eq('fulfillment_status','access_sent').lte('purchased_at',snapshot).order('purchased_at').order('id').range(offset,offset+499)
    if(error||!data)throw new Error('Could not load ticket reminders.')
    tickets.push(...data)
    if(data.length<500)break
  }
  let sent=0,failed=0
  for(const ticket of tickets){
    const deadline=ticket.screening.ticket_settings?.format==='flex'?ticket.screening.viewing_end:ticket.screening.event?.starts_at
    if(ticket.screening.event?.status!=='published'||!deadline||Date.parse(deadline)<=Date.now()||Date.parse(deadline)>Date.now()+86400000)continue
    try{const result=await sendFilmEmail(db,ticket,'reminder',`scheduled-reminder-${ticket.id}-${ticket.access_version}`);if(result?.trackingStatus==='accepted')sent++}catch{failed++}
  }
  return{sent,failed}
}
