import Stripe from 'stripe'
import { requireShopUser } from '../../../../lib/shopAuth'
import { initialSignupProvider } from '../../../../lib/onboardingEligibility'
import { purchaseEvent } from '../../../../lib/conversionEvents'

export async function GET(request) {
  const headers = { 'Cache-Control': 'private, no-store' }
  const user = await requireShopUser(request)
  if (!user) return Response.json({error:'Sign in required.'},{status:401,headers})
  const events = [], method = initialSignupProvider(user)
  if (method) events.push({key:`signup:${user.id}`,name:'sign_up',params:{method}})
  const sessionId = new URL(request.url).searchParams.get('session_id')
  if (!sessionId) return Response.json({events},{headers})
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return Response.json({error:'Invalid checkout reference.'},{status:400,headers})
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId,{expand:['line_items']})
    const owner = session.metadata?.userId || session.client_reference_id
    const guest = !owner && user.email_confirmed_at && user.email?.toLowerCase() === session.customer_details?.email?.toLowerCase()
    if (owner !== user.id && !guest) return Response.json({error:'Checkout not found.'},{status:404,headers})
    const supported = ['shop_order','tot_bundle'].includes(session.metadata?.kind) || ['article','audio','video'].includes(session.metadata?.itemType) || (session.mode === 'subscription' && session.metadata?.planId)
    if (!supported) return Response.json({events},{headers})
    if (session.line_items?.has_more) session.line_items.data = await stripe.checkout.sessions.listLineItems(session.id,{limit:100}).autoPagingToArray({limit:1000})
    const event = purchaseEvent(session)
    if (event) events.push(event)
    return Response.json({events,pending:session.status !== 'expired' && !event && session.payment_status !== 'no_payment_required'},{headers})
  } catch {
    return Response.json({error:'Payment confirmation temporarily unavailable.'},{status:503,headers})
  }
}
