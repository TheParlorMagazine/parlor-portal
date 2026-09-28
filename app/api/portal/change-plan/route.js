import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../../lib/apiAuth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRINTING_PRESS_ID = 'c666f321-47e5-40c1-bc2a-565a2f52f64d' // ships a physical magazine

const PLAN_PRICE_IDS = {
  'fccb348a-7433-4080-8699-9ef8c0e7a519': process.env.STRIPE_READERS_CIRCLE_PRICE_ID,
  [PRINTING_PRESS_ID]: process.env.STRIPE_PRINTING_PRESS_PRICE_ID,
}

// POST { planId } — swaps an EXISTING subscription to a different plan (with
// proration). Use this for members who already have an active subscription;
// new members go through create-subscription-checkout instead.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let planId
  try { planId = (await request.json())?.planId } catch {}
  const priceId = PLAN_PRICE_IDS[planId]
  if (!priceId) return Response.json({ error: 'Unknown plan' }, { status: 400 })

  const db = serviceClient()
  const { data: member } = await db.from('members').select('stripe_customer_id, mailing_address').eq('id', user.id).single()
  if (!member?.stripe_customer_id) return Response.json({ error: 'no_customer' }, { status: 409 })

  // The Printing Press ships a physical magazine — require a mailing address.
  if (planId === PRINTING_PRESS_ID && !member.mailing_address?.trim()) {
    return Response.json({ error: 'need_address' }, { status: 409 })
  }

  try {
    const subs = await stripe.subscriptions.list({ customer: member.stripe_customer_id, status: 'all', limit: 10 })
    const sub = subs.data.find(s => ['active', 'trialing', 'past_due'].includes(s.status))
    if (!sub) return Response.json({ error: 'no_active_subscription' }, { status: 409 })

    const item = sub.items.data[0]
    if (item.price.id === priceId) return Response.json({ ok: true, unchanged: true })

    await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
    })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
