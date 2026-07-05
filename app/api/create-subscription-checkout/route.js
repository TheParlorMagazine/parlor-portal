import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Plan UUIDs match public/dashboard.html's PLAN_IDS and app/checkout-relay.
const PLAN_PRICE_IDS = {
  'fccb348a-7433-4080-8699-9ef8c0e7a519': process.env.STRIPE_READERS_CIRCLE_PRICE_ID,
  'c666f321-47e5-40c1-bc2a-565a2f52f64d': process.env.STRIPE_PRINTING_PRESS_PRICE_ID,
}

export async function POST(request) {
  const { planId, userId, successUrl, cancelUrl } = await request.json()

  const priceId = PLAN_PRICE_IDS[planId]
  if (!priceId || !userId || !successUrl || !cancelUrl) {
    return Response.json({ error: 'planId, userId, successUrl, and cancelUrl are required' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
