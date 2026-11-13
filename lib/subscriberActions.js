// Server-only subscriber administration. Provider IDs always come from members.
export class SubscriberActionError extends Error {
  constructor(message,status=400,requiresReview=false){super(message);this.status=status;this.requiresReview=requiresReview}
}
const fail=(message,status=409,review=false)=>{throw new SubscriberActionError(message,status,review)}
const idOf=value=>typeof value==='string'?value:value?.id
const plans={free:{name:'Free',id:null,rank:0},readers:{name:"Reader's Circle",id:'fccb348a-7433-4080-8699-9ef8c0e7a519',rank:1},print:{name:'Printing Press',id:'c666f321-47e5-40c1-bc2a-565a2f52f64d',rank:2}}
const rank=member=>/print|press/i.test(member.plan||'')?2:/reader|circle/i.test(member.plan||'')?1:0
const decimals=currency=>['bif','clp','djf','gnf','jpy','kmf','krw','mga','pyg','rwf','ugx','vnd','vuv','xaf','xof','xpf'].includes(currency)?0:2
const priceIds=()=>({readers:process.env.STRIPE_READERS_CIRCLE_PRICE_ID,print:process.env.STRIPE_PRINTING_PRESS_PRICE_ID})
async function memberRow(db,id){const{data,error}=await db.from('members').select('*').eq('id',id).maybeSingle();if(error)fail('Subscriber could not be loaded.',503);if(!data)fail('Subscriber not found.',404);return data}
function protectedMember(member){if(['admin','editor','writer','finance_admin','social_admin'].includes(member.role))fail('Team accounts must be managed through team settings.');}
async function subscription(stripe,member){
 if(!member.stripe_subscription_id) return null
 const sub=await stripe.subscriptions.retrieve(member.stripe_subscription_id)
 if(!member.stripe_customer_id||idOf(sub.customer)!==member.stripe_customer_id)fail('Billing account does not match this subscriber. No changes were made.')
 return sub
}
function external(member){return member.billing_source && !['stripe','manual'].includes(member.billing_source)}
function statusPatch(member,status){return{...('subscription_status'in member?{subscription_status:status}:{}),...('status'in member?{status}: {})}}
async function save(db,member,patch,providerChanged=false){
 // Guard against a billing link changing while the admin dialog was open.
 let query=db.from('members').update(patch).eq('id',member.id)
 query=member.stripe_subscription_id?query.eq('stripe_subscription_id',member.stripe_subscription_id):query.is('stripe_subscription_id',null)
 const{data,error}=await query.select('*').maybeSingle()
 if(error||!data)fail(providerChanged?'Billing changed, but the subscriber record could not be refreshed. Check billing before retrying.':'Subscriber changed or could not be saved. Refresh the profile and retry.',503,providerChanged)
 return data
}
function billingSummary(sub){return sub?{id:sub.id,status:sub.status,cancelAtPeriodEnd:!!sub.cancel_at_period_end,periodEnd:sub.current_period_end?new Date(sub.current_period_end*1000).toISOString():null}:null}
function membershipInvoice(invoice,member){return idOf(invoice.customer)===member.stripe_customer_id&&!!idOf(invoice.subscription)&&(idOf(invoice.subscription)===member.stripe_subscription_id||(invoice.lines?.data||[]).some(line=>Object.values(priceIds()).filter(Boolean).includes(idOf(line.price))))}
async function invoicePayment(stripe,invoice){
 const piId=idOf(invoice.payment_intent)
 if(!piId)return null
 const pi=typeof invoice.payment_intent==='object'?invoice.payment_intent:await stripe.paymentIntents.retrieve(piId,{expand:['latest_charge']})
 const charge=typeof pi.latest_charge==='object'?pi.latest_charge:pi.latest_charge?await stripe.charges.retrieve(pi.latest_charge):null
 if(!charge||!charge.paid||charge.disputed)return null
 return{piId,remaining:Math.max(0,Number(charge.amount)-Number(charge.amount_refunded||0)),currency:charge.currency}
}
export async function subscriberActionContext(db,stripe,id,action=null){
 const member=await memberRow(db,id);protectedMember(member)
 const sub=external(member)||action==='remove'?null:await subscription(stripe,member)
 const invoices=[]
 if(action==='refund'&&member.stripe_customer_id&&!external(member)){
  const list=await stripe.invoices.list({customer:member.stripe_customer_id,status:'paid',limit:20,expand:['data.payment_intent.latest_charge']})
  for(const invoice of list.data||[]){if(!membershipInvoice(invoice,member))continue;const payment=await invoicePayment(stripe,invoice);if(payment?.remaining>0)invoices.push({id:invoice.id,remaining:payment.remaining,currency:payment.currency,decimals:decimals(payment.currency),created:invoice.created})}
 }
 return{member,billing:billingSummary(sub),externalBilling:external(member)?member.billing_source:null,invoices}
}
export async function applySubscriberAction(db,stripe,actor,body){
 const member=await memberRow(db,body.memberId);protectedMember(member)
 const action=body.action
 if(!['upgrade','downgrade','cancel','resume','refund','remove'].includes(action))fail('Choose a supported subscriber action.',400)
 if(body.confirm!==true)fail('Confirm the subscriber change first.',400)
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.operationId||''))fail('A valid operation ID is required.',400)
 const options={idempotencyKey:`subscriber:${member.id}:${action}:${body.operationId}`}
 if(action==='remove'){
  // Removing newsletter consent never deletes an account or cancels billing.
  const updated=await save(db,member,{newsletter_subscribed:false,unsubscribed_at:member.unsubscribed_at||new Date().toISOString()})
  return{member:updated,message:'Removed from newsletter delivery. Account, access and payment history were retained.'}
 }
 if(external(member)&&!body.externalBillingConfirmed)fail(`Billing is managed through ${member.billing_source}. Complete the billing change there and confirm it before updating access here.`)
 if(action==='refund'){
  if(external(member))fail(`Refund this subscription through ${member.billing_source}; no local payment was refunded.`)
  if(!member.stripe_customer_id)fail('No linked Stripe billing account. No refund was issued.')
  if(typeof body.invoiceId!=='string'||!/^in_[a-zA-Z0-9]+$/.test(body.invoiceId))fail('Choose a valid membership invoice.',400)
  const invoice=await stripe.invoices.retrieve(body.invoiceId,{expand:['payment_intent.latest_charge']})
  if(!membershipInvoice(invoice,member))fail('Choose a membership invoice belonging to this subscriber.')
  const payment=await invoicePayment(stripe,invoice)
  if(!payment)fail('This invoice has no refundable card payment.')
  const prior=await stripe.refunds.list({payment_intent:payment.piId,limit:100})
  const previous=(prior.data||[]).find(r=>r.metadata?.parlor_operation_id===body.operationId)
  if(previous){
   if(['failed','canceled'].includes(previous.status))fail('Stripe did not complete this refund. Check the payment before retrying.',502,true)
   return{member,message:previous.status==='succeeded'?'Refund completed. Membership and newsletter preferences are unchanged.':'This refund request was already submitted and is pending.',refund:{id:previous.id,status:previous.status}}
  }
  if(!Number.isSafeInteger(body.amount)||body.amount<=0||body.amount>payment.remaining)fail('Refund amount must be positive and no more than the remaining refundable payment.',400)
  const refund=await stripe.refunds.create({payment_intent:payment.piId,amount:body.amount,metadata:{parlor_operation_id:body.operationId,member_id:member.id,actor_id:actor.id}},options)
  if(['failed','canceled'].includes(refund.status))fail('Stripe did not complete this refund. Check the payment before retrying.',502,true)
  return{member,message:refund.status==='succeeded'?'Refund completed. Membership and newsletter preferences are unchanged.':'Refund submitted to Stripe and pending. Membership and newsletter preferences are unchanged.',refund:{id:refund.id,status:refund.status}}
 }
 if(member.billing_source==='stripe'&&!member.stripe_subscription_id)fail('This member has no linked current Stripe subscription. Check billing before changing access; an old paid plan is not proof of active billing.')
 const sub=external(member)?null:await subscription(stripe,member)
 if(action==='cancel'||action==='resume'){
  if(sub){
   if(!['active','trialing','past_due'].includes(sub.status))fail('This Stripe subscription is not active. Refresh billing before making changes.')
   if(action==='resume'&&body.immediate)fail('Cannot resume an immediately cancelled subscription.')
   const changed=action==='cancel'&&body.immediate===true?await stripe.subscriptions.cancel(sub.id,{},options):await stripe.subscriptions.update(sub.id,{cancel_at_period_end:action==='cancel'},options)
   if(changed.status==='canceled'){
    const updated=await save(db,member,{plan:null,plan_id:null,stripe_subscription_id:null,...statusPatch(member,'cancelled'),...('print_subscriber'in member?{print_subscriber:false}:{})},true)
    return{member:updated,billing:billingSummary(changed),message:'Subscription cancelled immediately. Newsletter preferences are unchanged.'}
   }
   return{member:await memberRow(db,member.id),billing:billingSummary(changed),message:action==='cancel'?'Renewal cancelled. Paid access continues until the end of the billing period.':'Subscription renewal resumed.'}
  }
  if(action==='resume')fail('No Stripe subscription is available to resume.')
  const updated=await save(db,member,{plan:null,plan_id:null,...statusPatch(member,'cancelled'),...('print_subscriber'in member?{print_subscriber:false}:{})})
  return{member:updated,message:'Local membership access cancelled. Newsletter preferences are unchanged.'}
 }
 const target=plans[body.plan]
 if(!target)fail('Choose a supported membership plan.',400)
 if(action==='upgrade'?target.rank<=rank(member):target.rank>=rank(member))fail('Choose a higher plan for an upgrade or a lower plan for a downgrade.',400)
 if(sub){
  if(target.rank===0)fail('Use Cancel subscription to end paid billing and return to free access.')
  if(sub.cancel_at_period_end)fail('This subscription has a scheduled cancellation. Resume renewal before changing its plan.')
  if(!['active','trialing'].includes(sub.status)||sub.items?.data?.length!==1)fail('This subscription requires a billing review before a plan change.')
  const targetPrice=priceIds()[body.plan]
  if(!targetPrice)fail('The selected Stripe plan price is not configured.',503)
  const price=await stripe.prices.retrieve(targetPrice)
  const current=sub.items.data[0]
  if(!price.active||price.type!=='recurring'||price.currency!==current.price.currency||price.recurring?.interval!==current.price.recurring?.interval||price.recurring?.interval_count!==current.price.recurring?.interval_count)fail('Plan currency or billing interval differs. Review this change in Stripe.')
  const changed=await stripe.subscriptions.update(sub.id,{items:[{id:current.id,price:targetPrice,quantity:current.quantity||1}],proration_behavior:'none',metadata:{...sub.metadata,planId:target.id}},options)
  if(idOf(changed.items?.data?.[0]?.price)!==targetPrice)fail('Stripe did not confirm the selected plan. Check billing before retrying.',502,true)
 }
 const updated=await save(db,member,{plan:target.name,plan_id:target.id,...statusPatch(member,'active'),...('print_subscriber'in member?{print_subscriber:target.rank===2}:{}),...(!member.billing_source?{billing_source:'manual'}:{})},!!sub)
 return{member:updated,message:sub?'Plan updated. No proration was charged; the new recurring price applies on the next invoice. Newsletter preferences are unchanged.':'Membership access updated. No new paid subscription or charge was created. Newsletter preferences are unchanged.'}
}
