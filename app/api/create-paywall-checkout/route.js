import Stripe from 'stripe'
import { serviceClient } from '../../../lib/apiAuth'
import { ensureStripeCustomer } from '../../../lib/stripeCustomer'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const { stripePriceId, articleId, itemType, userId, successUrl, cancelUrl } = await request.json()

  if (!stripePriceId || !successUrl || !cancelUrl) {
    return Response.json({ error: 'stripePriceId, successUrl, and cancelUrl are required' }, { status: 400 })
  }

  try {
    const params = {
      mode: 'payment',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId || undefined,
      metadata: {
        articleId: articleId || '',
        itemType: itemType || 'article',
        userId: userId || '',
      },
    }
    // If we know the member, attach their customer and save the card for future
    // use so it auto-populates in Settings and speeds up their next purchase.
    if (userId) {
      try {
        const customerId = await ensureStripeCustomer(serviceClient(), stripe, userId)
        if (customerId) {
          params.customer = customerId
          params.payment_intent_data = { setup_future_usage: 'off_session' }
        }
      } catch {}
    }
    const session = await stripe.checkout.sessions.create(params)

    return Response.json({ url: session.url })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
