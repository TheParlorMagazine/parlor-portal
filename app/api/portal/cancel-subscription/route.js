import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../../lib/apiAuth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function activeSub(customerId) {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
  return subs.data.find(s => ['active', 'trialing', 'past_due'].includes(s.status)) || null
}

// GET → current subscription state for the signed-in member
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { data: member } = await db.from('members').select('stripe_customer_id').eq('id', user.id).single()
  if (!member?.stripe_customer_id) return Response.json({ subscription: null })
  try {
    const sub = await activeSub(member.stripe_customer_id)
    if (!sub) return Response.json({ subscription: null })
    return Response.json({
      subscription: {
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: sub.current_period_end,
      },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST { action: 'cancel' | 'resume' }
// cancel → stops recurring billing at period end (member keeps access until then)
// resume → undoes a pending cancellation
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let action = 'cancel'
  try { action = (await request.json())?.action || 'cancel' } catch {}

  const db = serviceClient()
  const { data: member } = await db
    .from('members').select('stripe_customer_id').eq('id', user.id).single()
  if (!member?.stripe_customer_id) {
    return Response.json({ error: 'no_customer' }, { status: 409 })
  }

  try {
    const sub = await activeSub(member.stripe_customer_id)
    if (!sub) return Response.json({ error: 'no_active_subscription' }, { status: 409 })

    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: action !== 'resume',
    })

    return Response.json({
      cancel_at_period_end: updated.cancel_at_period_end,
      current_period_end: updated.current_period_end, // unix seconds
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
