import { checkoutOrigin } from '../../../../lib/checkoutOrigin'
import { createReservedCheckout } from '../../../../lib/checkoutReservations'
import { requireShopUser } from '../../../../lib/shopAuth'
import { ensureStripeCustomer } from '../../../../lib/stripeCustomer'
import { prepareShopCart } from '../../../../lib/prepareShopCart'
import Stripe from 'stripe'
import { serviceClient } from '../../../../lib/apiAuth'
import { currencyForRequest, countryFromRequest } from '../../../../lib/geo'
import { quoteCartShipping } from '../../../../lib/shopShipping'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Countries we ship to (mirrors the print-subscription list).
const SHIP_COUNTRIES = ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'FR', 'DE', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT', 'CH', 'PT', 'MX', 'BR', 'JP']

export async function POST(request) {
  const user = await requireShopUser(request)
  if (!user) return Response.json({ error: 'Sign in or create an account before checkout.' }, { status: 401 })
  if (!user.email_confirmed_at) return Response.json({error:'Verify your email before purchasing.'},{status:403})
  let body = {}; try { body = await request.json() } catch {}
  const { items, successUrl, cancelUrl, address, requestId } = body
  // Ship-to country: from address if provided, else cart selector, else detected, else US.
  const shipCountry = String(address?.country || body.country || countryFromRequest(request) || 'US').toUpperCase()
  if (!Array.isArray(items) || !items.length || !successUrl || !cancelUrl) {
    return Response.json({ error: 'items, successUrl and cancelUrl are required' }, { status: 400 })
  }

  const db = serviceClient()
  let prepared
  const currency = currencyForRequest(request)
  const origin = checkoutOrigin(request)
  let cancel
  try {
    cancel = new URL(cancelUrl, origin)
    if (cancel.origin !== origin) throw new Error('Checkout must return to this site.')
    if (!SHIP_COUNTRIES.includes(shipCountry)) throw new Error('We do not ship to this country.')
    if (address?.line1 && (![address.line1,address.city,address.zip].every(v => typeof v === 'string' && v.trim()))) throw new Error('Complete your delivery address before checkout.')
    prepared = await prepareShopCart(db, items, currency, shipCountry)
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
  const line_items = prepared.lineItems
  const customer = await ensureStripeCustomer(db, stripe, user.id)
  if (!customer) return Response.json({ error: 'Your billing account could not be linked.' }, { status: 409 })

  // Live Printify shipping quote for the chosen country (same-numeral in the
  // billing currency). Lock Stripe's address collection to that country so the
  // quote we charge matches where it ships.
  const quote = await quoteCartShipping(db, prepared.shippingItems, shipCountry, address?.state, new Map(prepared.shippingItems.map(i => [i.id, i.resolvedProduct])), address)
  const allowed = SHIP_COUNTRIES.includes(shipCountry) ? [shipCountry] : SHIP_COUNTRIES

  // If the customer pre-filled their address in-app, pass it on the payment intent
  // so Stripe records it without showing its own address form. Otherwise fall back
  // to Stripe's address collection step.
  const hasAddress = address?.line1?.trim()
  const paymentIntentShipping = hasAddress ? {
    name: address.name || 'Customer',
    address: {
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.zip || '',
      country: shipCountry,
    },
  } : undefined

  const base = {
    mode: 'payment',
    line_items,
    currency,
    success_url: `${origin}/shop/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancel.toString(),
    client_reference_id: user.id,
    customer,
    metadata: { kind: 'shop_order', userId: user.id, ship_country: shipCountry },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: quote.cents, currency },
        display_name: 'Standard shipping',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 5 },
          maximum: { unit: 'business_day', value: 14 },
        },
      },
    }],
    // Only show Stripe's address form if the customer didn't pre-fill it in-app.
    ...(hasAddress
      ? { payment_intent_data: { shipping: paymentIntentShipping } }
      : { shipping_address_collection: { allowed_countries: allowed } }
    ),
  }

  try {
    const inventory=prepared.shippingItems.map(p=>({product_id:p.id,variant_id:p.printify_variant_id || null,quantity:p.qty}))
    // Dashboard-managed payment methods avoid a second, differently-shaped
    // create request after an uncertain provider response.
    const session=await createReservedCheckout({db,stripe,userId:user.id,requestId,kind:'shop_order',inventory,params:base})
    return Response.json({url:session.url})
  } catch(error) { return Response.json({error:error.message}, {status:409}) }
}
