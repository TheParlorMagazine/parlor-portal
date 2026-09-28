import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { ensureStripeCustomer } from '../../../../lib/stripeCustomer'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Opens a Stripe Checkout in "setup" mode so a member can save a payment method
// WITHOUT buying anything or holding a membership. Card wallets (Apple Pay /
// Google Pay) ride along with 'card'; PayPal is offered when the account has it
// enabled. The saved method becomes the customer's default (see the webhook),
// so future memberships and purchases auto-charge it.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let returnUrl = ''
  try { returnUrl = (await request.json())?.returnUrl || '' } catch {}
  const origin = new URL(request.url).origin
  const base = returnUrl || `${origin}/portal/settings`

  const db = serviceClient()
  const customerId = await ensureStripeCustomer(db, stripe, user.id)
  if (!customerId) return Response.json({ error: 'no_member' }, { status: 400 })

  const params = {
    mode: 'setup',
    customer: customerId,
    currency: 'usd',
    success_url: `${base}?saved=1`,
    cancel_url: base,
    metadata: { kind: 'save_pm', member_id: user.id },
  }

  // Try to include PayPal; if the account doesn't have it enabled, Stripe throws
  // — fall back to card (which also surfaces Apple Pay / Google Pay wallets).
  try {
    const session = await stripe.checkout.sessions.create({ ...params, payment_method_types: ['card', 'paypal'] })
    return Response.json({ url: session.url })
  } catch (err) {
    try {
      const session = await stripe.checkout.sessions.create({ ...params, payment_method_types: ['card'] })
      return Response.json({ url: session.url })
    } catch (err2) {
      return Response.json({ error: err2.message }, { status: 500 })
    }
  }
}
