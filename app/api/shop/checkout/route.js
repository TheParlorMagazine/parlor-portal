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
  const { items, successUrl, cancelUrl, userId, address } = body
  // Ship-to country: from address if provided, else cart selector, else detected, else US.
  const shipCountry = (address?.country || body.country || countryFromRequest(request) || 'US').toUpperCase()
  if (!Array.isArray(items) || !items.length || !successUrl || !cancelUrl) {
    return Response.json({ error: 'items, successUrl and cancelUrl are required' }, { status: 400 })
  }

  const db = serviceClient()
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Separate bundle IDs from regular product IDs
  const allIds = [...new Set(items.map(i => i.id).filter(id => UUID.test(id)))]
  if (!allIds.length) return Response.json({ error: 'No purchasable items in cart' }, { status: 400 })

  // Look up bundles and regular products in parallel
  const [{ data: bundles }, { data: products, error }] = await Promise.all([
    db.from('shop_bundles')
      .select('id, title, price, price_eur, price_gbp, images, shop_bundle_items(product_id, variant_id, quantity, shop_products(id, name, price, price_eur, price_gbp, fulfillment, printify_product_id, printify_variant_id, variants))')
      .in('id', allIds).eq('active', true),
    db.from('shop_products')
      .select('id, name, variant, price, price_eur, price_gbp, images, fulfillment, printify_product_id, printify_variant_id, variants, external_url, inventory')
      .in('id', allIds).eq('active', true),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const currency = currencyForRequest(request)
  const bundleById = new Map((bundles || []).map(b => [b.id, b]))
  const byId = new Map((products || []).map(p => [p.id, p]))

  const line_items = []
  for (const it of items) {
    const qty = Math.max(1, Math.min(20, Number(it.qty) || 1))

    // Bundle: single Stripe line item at bundle price; webhook expands to individual Printify lines
    const bundle = bundleById.get(it.id)
    if (bundle) {
      const amount = Math.round(priceForCurrency(bundle, currency) * 100)
      if (!amount) continue
      line_items.push({
        quantity: qty,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: bundle.title,
            images: bundle.images?.length ? [bundle.images[0]] : undefined,
            metadata: {
              shop_bundle_id: bundle.id,
              fulfillment: 'bundle',
              printify_product_id: '',
              printify_variant_id: '',
            },
          },
        },
      })
      continue
    }

    const p = byId.get(it.id)
    if (!p) continue
    if (p.external_url) continue
    // bundle_unit_price overrides the product price (pick-your-own bundles).
    const basePrice = it.bundle_unit_price != null ? Number(it.bundle_unit_price) : priceForCurrency(p, currency)
    const amount = Math.round(basePrice * 100)
    if (!amount) continue
    const variantId = it.printify_variant_id || p.printify_variant_id || p.variants?.[0]?.printify_variant_id || null
    // For collection products, each variant may point to a different Printify product.
    const variantObj = p.variants?.find(v => String(v.printify_variant_id) === String(variantId))
    const printifyProductId = it.printify_product_id || variantObj?.printify_product_id || p.printify_product_id || ''
    line_items.push({
      quantity: qty,
      price_data: {
        currency,
        unit_amount: amount,
        product_data: {
          name: p.name,
          description: (variantObj?.name || p.variant) || undefined,
          images: p.images?.length ? [p.images[0]] : undefined,
          metadata: {
            shop_product_id: p.id,
            fulfillment: p.fulfillment || 'manual',
            printify_product_id: printifyProductId,
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
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId || undefined,
    metadata: { kind: 'shop_order', userId: userId || '', ship_country: shipCountry },
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
