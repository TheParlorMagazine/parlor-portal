import Stripe from 'stripe'
import { serviceClient } from '../../../lib/apiAuth'
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
  const { planId, userId, successUrl, cancelUrl } = await request.json()

  const priceId = PLAN_PRICE_IDS[planId]
  if (!priceId || !userId || !successUrl || !cancelUrl) {
    return Response.json({ error: 'planId, userId, successUrl, and cancelUrl are required' }, { status: 400 })
  }

  try {
    const params = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
    }
    // Reuse the member's existing Stripe customer (e.g. if they already saved a
    // card in Settings) so we never create a duplicate and orphan saved methods.
    try {
      const customerId = await ensureStripeCustomer(serviceClient(), stripe, userId)
      if (customerId) params.customer = customerId
    } catch {}
    // The Printing Press ships a physical magazine, so collect a shipping address
    // at checkout. The webhook saves it back to members.mailing_address.
    if (planId === PRINTING_PRESS_ID) {
      params.shipping_address_collection = { allowed_countries: SHIP_COUNTRIES }
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
