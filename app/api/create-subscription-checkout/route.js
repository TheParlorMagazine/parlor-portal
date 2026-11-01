import { checkoutOrigin } from '../../../lib/checkoutOrigin'
import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../lib/apiAuth'
import { ensureStripeCustomer } from '../../../lib/stripeCustomer'
import { currencyForRequest } from '../../../lib/geo'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Plan UUIDs match public/dashboard.html's PLAN_IDS and app/checkout-relay.
const READERS_CIRCLE_ID = 'fccb348a-7433-4080-8699-9ef8c0e7a519'
const PRINTING_PRESS_ID = 'c666f321-47e5-40c1-bc2a-565a2f52f64d' // ships a print magazine

const PLAN_PRICE_IDS = {
  [READERS_CIRCLE_ID]: process.env.STRIPE_READERS_CIRCLE_PRICE_ID,
  [PRINTING_PRESS_ID]: process.env.STRIPE_PRINTING_PRESS_PRICE_ID,
}

// Countries the print magazine ships to.
const SHIP_COUNTRIES = ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'FR', 'DE', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT', 'CH', 'PT', 'MX', 'BR', 'JP']

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in or create an account before subscribing.' }, { status: 401 })
  try {
    const { planId, successUrl, cancelUrl, coupon } = await request.json()
    const priceId = PLAN_PRICE_IDS[planId]
    if (!priceId) return Response.json({ error: 'Unknown subscription plan.' }, { status: 400 })
    const origin = checkoutOrigin(request)
    const success = new URL(successUrl || '/portal/subscriptions', origin)
    const cancel = new URL(cancelUrl || '/plans', origin)
    if (success.origin !== origin || cancel.origin !== origin) return Response.json({ error: 'Checkout must return to this site.' }, { status: 400 })
    const db = serviceClient()
    const { data: member, error: memberError } = await db.from('members').select('id').eq('id', user.id).single()
    if (memberError || !member) return Response.json({ error: 'Your account is not ready for checkout. Please sign in again or contact us.' }, { status: 409 })
    // Never accept an account id from the browser or silently create guest checkout.
    const customerId = await ensureStripeCustomer(db, stripe, user.id)
    if (!customerId) throw new Error('Could not link a billing account')
    const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
    if (existing.data.some(sub => ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete'].includes(sub.status) && sub.items.data.some(item => Object.values(PLAN_PRICE_IDS).includes(item.price.id)))) {
      return Response.json({ url: `${origin}/portal/subscriptions`, alreadySubscribed: true })
    }
    const params = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success.toString(),
      cancel_url: cancel.toString(),
      client_reference_id: user.id,
      customer: customerId,
      metadata: { userId: user.id, planId },
      subscription_data: { metadata: { userId: user.id, planId } },
    }
    // The Printing Press ships a physical magazine, so collect a shipping address
    // at checkout. The webhook saves it back to members.mailing_address.
    if (planId === PRINTING_PRESS_ID) {
      params.shipping_address_collection = { allowed_countries: SHIP_COUNTRIES }
    }
    // Apply coupon programmatically (mutually exclusive with allow_promotion_codes).
    if (coupon) {
      params.discounts = [{ coupon }]
    }
    // Same-numeral geo pricing: charge €7/£7 (not FX-converted) via the price's
    // currency_options. A returning customer whose Stripe currency is already
    // locked can't switch — fall back to their existing currency in that case.
    const currency = currencyForRequest(request)
    let session
    try {
      session = await stripe.checkout.sessions.create({ ...params, currency })
    } catch (e) {
      if (/currency/i.test(e?.message || '')) {
        session = await stripe.checkout.sessions.create(params)
      } else { throw e }
    }

    return Response.json({ url: session.url })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
