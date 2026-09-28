import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../../lib/apiAuth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Creates a Stripe Billing Portal session so the member can manage payment
// method, view invoices, or cancel — all handled by Stripe's hosted UI.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let returnUrl = ''
  try { returnUrl = (await request.json())?.returnUrl || '' } catch {}

  const db = serviceClient()
  const { data: member } = await db
    .from('members').select('stripe_customer_id').eq('id', user.id).single()

  if (!member?.stripe_customer_id) {
    return Response.json({ error: 'no_customer' }, { status: 409 })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: returnUrl || `${new URL(request.url).origin}/portal/subscriptions`,
    })
    return Response.json({ url: session.url })
  } catch (err) {
    // Most common cause: the Customer Portal isn't activated in Stripe settings.
    return Response.json({ error: err.message }, { status: 500 })
  }
}
