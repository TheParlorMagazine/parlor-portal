import { createHash } from 'node:crypto'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const validCheckoutIntent = id => typeof id === 'string' && UUID.test(id)
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const live = ['creating','open','pending','paid']
function paramsFor(row) {
  return {...row.stripe_params, metadata:{...row.stripe_params.metadata,reservation_id:row.id}}
}
async function observe(db, row, session, state) {
  if (session.metadata?.reservation_id !== row.id || (session.metadata?.userId || session.client_reference_id) !== row.member_id) throw new Error('Checkout allocation identity mismatch')
  const {data,error}=await db.rpc('observe_checkout',{p_id:row.id,p_session:session.id,p_state:state})
  if(error)throw new Error('Checkout allocation could not be saved')
  return data
}
export async function observeStripeCheckout(db,stripe,row,providedSession=null,{forceExpire=false}={}) {
  // Always retrieve the current provider state; delayed/out-of-order events do
  // not authorize a release using stale event data.
  let session=await stripe.checkout.sessions.retrieve(providedSession?.id || row.stripe_session_id)
  if(session.payment_status==='paid' && session.status==='complete') {await observe(db,row,session,'paid');return session}
  if(session.status==='open' && (forceExpire || Date.now()>=Date.parse(row.expires_at))) {
    try {await stripe.checkout.sessions.expire(session.id)} catch { /* A payment may have won the race. Re-read. */ }
    session=await stripe.checkout.sessions.retrieve(session.id)
    if(session.payment_status==='paid' && session.status==='complete'){await observe(db,row,session,'paid');return session}
  }
  let state='open'
  if(session.status==='complete') {
    state='pending'
    if(session.payment_intent) {
      const pi=await stripe.paymentIntents.retrieve(typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id)
      // An asynchronously processing payment keeps its hold regardless of age.
      if(pi.status==='canceled') state='released'
      else if(pi.status==='requires_payment_method') {
        try { await stripe.paymentIntents.cancel(pi.id) } catch {}
        const current=await stripe.paymentIntents.retrieve(pi.id)
        if(current.status==='canceled')state='released'
      }
    }
  } else if(session.status==='expired') {
    state='released'
    if(session.payment_intent){const pi=await stripe.paymentIntents.retrieve(typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id);if(['processing','succeeded','requires_capture'].includes(pi.status)) state='pending'
      else if(pi.status!=='canceled') {
        try {await stripe.paymentIntents.cancel(pi.id)} catch {}
        const current=await stripe.paymentIntents.retrieve(pi.id)
        if(current.status!=='canceled')state='pending'
      }}
  }
  await observe(db,row,session,state)
  return session
}
export async function createReservedCheckout({db,stripe,userId,requestId,kind,inventory=[],treatIds=[],params,resource=null}) {
  if(!process.env.INVENTORY_RECONCILE_SECRET)throw new Error('Checkout is temporarily unavailable. Please try again later.')
  if(!validCheckoutIntent(requestId))throw new Error('Invalid purchase intent. Please restart checkout.')
  const fingerprint=digest({kind,inventory,treatIds,params:{...params,expires_at:undefined}})
  const expires=new Date(Date.now()+31*60*1000)
  const {data:row,error}=await db.rpc('reserve_checkout',{p_member:userId,p_request:requestId,p_kind:kind,p_fingerprint:fingerprint,p_resource:resource || fingerprint,p_inventory:inventory,p_treats:treatIds,p_params:{...params,expires_at:Math.floor(expires.getTime()/1000)},p_expires:expires.toISOString()})
  if(error || !row)throw new Error(error?.message || 'Could not allocate this purchase.')
  if(row.state==='consumed')return {sessionId:row.stripe_session_id,url:row.kind==='digital'?new URL(row.stripe_params.cancel_url).toString():new URL('/shop/order-confirmed?session_id='+row.stripe_session_id,row.stripe_params.success_url).toString()}
  if(!live.includes(row.state))throw new Error('This checkout expired. Please start a new purchase.')
  let session
  if(row.stripe_session_id)session=await observeStripeCheckout(db,stripe,row)
  else {
    if(Date.now()-Date.parse(row.created_at)>=23*3600000) {
      await recoverReservationSession(db,stripe,row)
      throw new Error('This older checkout was reconciled. Please reload to continue.')
    }
    // Same immutable parameters and key recover a response lost after acceptance.
    // Never issue a differently-shaped fallback after a timeout or server error.
    try {session=await stripe.checkout.sessions.create(paramsFor(row),{idempotencyKey:'parlor-reservation-'+row.id})}
    catch(error) {
      if(error.type==='StripeInvalidRequestError' && error.statusCode===400 && Date.now()-Date.parse(row.created_at)<23*3600000) {
        const {error:releaseError}=await db.rpc('reject_checkout_creation',{p_id:row.id});if(releaseError)throw new Error('Rejected checkout needs reconciliation')
      }
      throw error
    }
    session=await observeStripeCheckout(db,stripe,row,session)
  }
  if(session.status==='expired')throw new Error('This checkout expired. Please start a new purchase.')
  if(session.status==='complete')return {sessionId:session.id,url:row.kind==='digital'?row.stripe_params.success_url.replace('{CHECKOUT_SESSION_ID}',session.id):new URL('/shop/order-confirmed?session_id='+session.id,row.stripe_params.success_url).toString()}
  if(!session.url)throw new Error('Checkout is not ready. Please try again.')
  return {url:session.url,sessionId:session.id}
}

export async function recoverReservationSession(db,stripe,row) {
  if(row.stripe_session_id)return observeStripeCheckout(db,stripe,row)
  // Recover unknown create outcomes with the original idempotency key. After
  // the provider's 24h window, discover rather than risk recreating a payment.
  if(Date.now()-Date.parse(row.created_at)<23*60*60*1000) {
    try {const session=await stripe.checkout.sessions.create(paramsFor(row),{idempotencyKey:'parlor-reservation-'+row.id});return await observeStripeCheckout(db,stripe,row,session)}catch(error){if(Date.now()<Date.parse(row.expires_at))throw error}
  }
  let after
  const deadline=Date.now()+12000
  for(let page=0;page<100;page++) {
    if(Date.now()>deadline)throw new Error('Discovery time budget reached; allocation retained for retry')
    const list=await stripe.checkout.sessions.list({customer:row.stripe_params.customer,created:{gte:Math.floor(Date.parse(row.created_at)/1000)-60},limit:100,...(after?{starting_after:after}:{})})
    const session=list.data.find(s=>s.metadata?.reservation_id===row.id)
    if(session)return observeStripeCheckout(db,stripe,row,{id:session.id})
    if(!list.has_more) {
      if(Date.now()<Date.parse(row.expires_at)+60000)throw new Error('Checkout creation still being reconciled')
      // A fully searched, expired creation window cannot produce a newly open
      // session: the immutable expires_at is already past. No counters change.
      const {error}=await db.rpc('release_uncreated_checkout',{p_id:row.id})
      if(error)throw error
      return null
    }
    after=list.data.at(-1)?.id
  }
  throw new Error('Checkout discovery limit reached; allocation retained for review')
}
