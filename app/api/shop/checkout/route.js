import Stripe from 'stripe'
import { serviceClient } from '../../../../lib/apiAuth'
import { currencyForRequest, priceForCurrency, countryFromRequest } from '../../../../lib/geo'
import { quoteCartShipping } from '../../../../lib/shopShipping'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Countries we ship to (mirrors the print-subscription list).
const SHIP_COUNTRIES = ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'FR', 'DE', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT', 'CH', 'PT', 'MX', 'BR', 'JP']

// Buy-now-pay-later methods offered per billing currency. Only list methods
// activated in the Stripe Dashboard (Klarna + Afterpay/Clearpay are live; add
// 'affirm' to usd here once it's activated). If a listed method isn't active,
// the checkout falls back to dynamic dashboard methods.
const BNPL_METHODS = {
  usd: ['klarna', 'afterpay_clearpay'],
  gbp: ['klarna', 'afterpay_clearpay'],
  eur: ['klarna', 'afterpay_clearpay'],
}

export async function POST(request) {
  let body = {}; try { body = await request.json() } catch {}
  const { items, successUrl, cancelUrl, userId } = body
  // Ship-to country: from the cart selector, else detected, else US.
  const shipCountry = (body.country || countryFromRequest(request) || 'US').toUpperCase()
  if (!Array.isArray(items) || !items.length || !successUrl || !cancelUrl) {
    return Response.json({ error: 'items, successUrl and cancelUrl are required' }, { status: 400 })
  }

  const db = serviceClient()
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const ids = [...new Set(items.map(i => i.id).filter(id => UUID.test(id)))]
  if (!ids.length) return Response.json({ error: 'No purchasable items in cart' }, { status: 400 })
  const { data: products, error } = await db.from('shop_products')
    .select('id, name, variant, price, price_eur, price_gbp, images, fulfillment, printify_product_id, printify_variant_id, variants, external_url, inventory')
    .in('id', ids).eq('active', true)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const currency = currencyForRequest(request)
  const byId = new Map((products || []).map(p => [p.id, p]))

  const line_items = []
  let hasPrintify = false
  for (const it of items) {
    const p = byId.get(it.id)
    if (!p) continue
    if (p.external_url) continue // externally fulfilled (e.g. Wix) — not sold through in-app checkout
    const qty = Math.max(1, Math.min(20, Number(it.qty) || 1))
    const amount = Math.round(priceForCurrency(p, currency) * 100)
    if (!amount) continue
    const variantId = it.printify_variant_id || p.printify_variant_id || p.variants?.[0]?.printify_variant_id || null
    if (p.fulfillment === 'printify') hasPrintify = true
    line_items.push({
      quantity: qty,
      price_data: {
        currency,
        unit_amount: amount,
        product_data: {
          name: p.name,
          description: p.variant || undefined,
          images: p.images?.length ? [p.images[0]] : undefined,
          metadata: {
            shop_product_id: p.id,
            fulfillment: p.fulfillment || 'manual',
            printify_product_id: p.printify_product_id || '',
            printify_variant_id: variantId ? String(variantId) : '',
          },
        },
      },
    })
  }
  if (!line_items.length) return Response.json({ error: 'No purchasable items in cart' }, { status: 400 })

  // Live Printify shipping quote for the chosen country (same-numeral in the
  // billing currency). Lock Stripe's address collection to that country so the
  // quote we charge matches where it ships.
  const quote = await quoteCartShipping(db, items, shipCountry)
  const allowed = SHIP_COUNTRIES.includes(shipCountry) ? [shipCountry] : SHIP_COUNTRIES

  const base = {
    mode: 'payment',
    line_items,
    currency,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId || undefined,
    metadata: { kind: 'shop_order', userId: userId || '', ship_country: shipCountry },
    shipping_address_collection: { allowed_countries: allowed },
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
  }

  // Buy-now-pay-later: offer the BNPL methods eligible for the billing currency
  // alongside cards. These must be activated in the Stripe Dashboard (Settings →
  // Payment methods); if any isn't, Stripe rejects the explicit list, so we fall
  // back to dynamic (dashboard-enabled) methods.
  try {
    const session = await stripe.checkout.sessions.create({ ...base, payment_method_types: ['card', ...(BNPL_METHODS[currency] || [])] })
    return Response.json({ url: session.url })
  } catch (bnplErr) {
    try {
      const session = await stripe.checkout.sessions.create(base)
      return Response.json({ url: session.url })
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 })
    }
  }
}
