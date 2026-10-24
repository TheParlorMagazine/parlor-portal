import { fulfillItemPurchase } from '../../../../lib/itemPurchase'
import Stripe from 'stripe'
import { sendStripeEmailOnce } from '../../../../lib/stripeEmail'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentConfirmedEmail, sendPaymentFailedEmail, sendCancellationEmail, sendOrderConfirmationEmail } from '../../../../lib/emails'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PLANS = {
  [process.env.STRIPE_READERS_CIRCLE_PRICE_ID]: {
    plan: "Reader's Circle",
    plan_id: 'fccb348a-7433-4080-8699-9ef8c0e7a519',
    amount: 10,
  },
  [process.env.STRIPE_PRINTING_PRESS_PRICE_ID]: {
    plan: 'Printing Press',
    plan_id: 'c666f321-47e5-40c1-bc2a-565a2f52f64d',
    amount: 25,
  },
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Make a payment method the customer's default for future invoices/charges, but
// only if they don't already have one set (so we never override an explicit
// choice). Used after saving a card, subscribing, or a one-time purchase.
async function setDefaultIfUnset(customerId, paymentMethodId) {
  if (!customerId || !paymentMethodId) return
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer?.invoice_settings?.default_payment_method) return
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })
  } catch (e) { console.error('setDefaultIfUnset failed:', e.message) }
}

// A member saved a card/PayPal via Settings (setup-mode Checkout, no purchase).
// Attach it as their default so future charges use it.
async function handleSavedPaymentMethod(session) {
  if (!session.setup_intent || !session.customer) return
  try {
    const si = await stripe.setupIntents.retrieve(session.setup_intent)
    if (si?.payment_method) await setDefaultIfUnset(session.customer, si.payment_method)
  } catch (e) { console.error('handleSavedPaymentMethod failed:', e.message) }
}

// Trick-or-Treat bundle purchase: decrement treat stock, record an order.
async function handleTotBundle(session, eventId) {
  const supabase = getSupabase()

  // Dedupe webhook retries
  const { data: dupe } = await supabase.from('orders').select('id').eq('stripe_session_id', session.id).maybeSingle()
  if (dupe) return

  const treatIds = (session.metadata?.treat_ids || '').split(',').map(s => s.trim()).filter(Boolean)
  const collectionId = session.metadata?.collection_id || null

  // Decrement stock for each chosen treat
  if (treatIds.length) {
    for (const tid of treatIds) {
      await supabase.rpc('decrement_tot_treat_stock', { treat_id: tid }).catch(() => {
        // Fallback: manual decrement if RPC doesn't exist yet
        supabase.from('tot_treats').select('stock').eq('id', tid).single().then(({ data: t }) => {
          if (t) supabase.from('tot_treats').update({ stock: Math.max(0, (t.stock || 1) - 1) }).eq('id', tid)
        })
      })
    }
  }

  // Resolve member
  let memberId = session.metadata?.userId || session.client_reference_id || null
  if (!memberId && session.customer) {
    const { data: m } = await supabase.from('members').select('id').eq('stripe_customer_id', session.customer).single()
    memberId = m?.id || null
  }

  // Shipping address
  let ship = session.collected_information?.shipping_details || session.shipping_details || null
  if (!ship?.address?.line1 && typeof session.payment_intent === 'string') {
    try {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent)
      if (pi?.shipping?.address?.line1) ship = pi.shipping
    } catch {}
  }
  const a = ship?.address || {}
  const shipName = ship?.name || session.customer_details?.name || ''

  // Resolve treat names for order_items (look up tot_treats + linked product names)
  let treatRows = []
  if (treatIds.length) {
    const { data: treats } = await supabase
      .from('tot_treats')
      .select('id, name, product_id, shop_products(name, images)')
      .in('id', treatIds)
    treatRows = (treats || []).map(t => ({
      product_name: t.shop_products?.name || t.name,
      quantity: 1,
      unit_price_cents: 0,
      image_url: t.shop_products?.images?.[0] || null,
    }))
  }

  // Standalone product names (tote etc.)
  const standaloneIds = (session.metadata?.standalone_product_ids || '').split(',').filter(Boolean)
  if (standaloneIds.length) {
    const { data: prods } = await supabase
      .from('shop_products')
      .select('id, name, images')
      .in('id', standaloneIds)
    for (const p of prods || []) {
      treatRows.push({ product_name: p.name, quantity: 1, unit_price_cents: 0, image_url: p.images?.[0] || null })
    }
  }

  let orderNumber = null
  try { const { data: n } = await supabase.rpc('next_order_number'); if (n) orderNumber = n } catch {}

  const totalCents = session.amount_total || 0

  const { data: order, error } = await supabase.from('orders').insert({
    member_id: memberId || null,
    stripe_session_id: session.id,
    email: session.customer_details?.email || '',
    shipping_name: shipName,
    shipping_address: ship ? formatAddress(shipName, a) : null,
    subtotal_cents: totalCents,
    shipping_cents: 0,
    total_cents: totalCents,
    currency: session.currency || 'usd',
    status: 'paid',
    order_number: orderNumber,
    metadata: {
      kind: 'tot_bundle',
      collection_id: collectionId,
      treat_ids: treatIds,
      standalone_product_ids: standaloneIds,
    },
  }).select().single()

  if (error) { console.error('tot_bundle order insert error:', error); return }

  // Insert order_items so the admin Orders page shows the treat names
  if (treatRows.length) {
    await supabase.from('order_items').insert(
      treatRows.map(r => ({ ...r, order_id: order.id }))
    )
  }

  // Send the standard shop order confirmation email with the treat list
  try {
    const buyerEmail = session.customer_details?.email || order.email
    if (buyerEmail) {
      await sendStripeEmailOnce({
        eventId,
        type: 'tot_bundle_confirmation',
        to: buyerEmail,
        send: () => sendOrderConfirmationEmail({
          to: buyerEmail,
          name: shipName || 'there',
          order,
          items: treatRows,
        }),
      })
    }
  } catch (e) { console.error('tot_bundle confirmation email error:', e.message) }
}

// Shop purchases (physical merch/print) → create an order the member can track
// in the portal. Triggered by a mode=payment checkout carrying shipping (or a
// metadata.kind of 'shop_order'), as opposed to digital item unlocks above.
async function handleShopOrder(session, eventId) {
  const supabase = getSupabase()

  // Dedupe webhook retries on the checkout session.
  const { data: dupe } = await supabase.from('orders').select('id').eq('stripe_session_id', session.id).maybeSingle()
  if (dupe) return

  let memberId = session.metadata?.userId || session.client_reference_id || null
  if (!memberId && session.customer) {
    const { data: m } = await supabase.from('members').select('id').eq('stripe_customer_id', session.customer).single()
    memberId = m?.id || null
  }

  // Shipping address: prefer what Stripe collected (address collection step), then
  // what we pre-filled via payment_intent_data.shipping (in-app address form),
  // then billing details as a last resort.
  let ship = session.collected_information?.shipping_details || session.shipping_details || null
  if (!ship?.address?.line1 && typeof session.payment_intent === 'string') {
    try {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent)
      if (pi?.shipping?.address?.line1) ship = pi.shipping
    } catch {}
  }
  ship = ship || session.customer_details || {}
  const shippingAddress = ship?.address?.line1 ? formatAddress(null, ship.address) : null

  let orderNumber = null
  try { const { data: n } = await supabase.rpc('next_order_number'); if (n) orderNumber = n } catch {}

  const { data: order, error } = await supabase.from('orders').insert({
    member_id: memberId,
    email: session.customer_details?.email || null,
    order_number: orderNumber,
    status: 'processing',
    shipping_name: ship?.name || session.customer_details?.name || null,
    shipping_address: shippingAddress,
    subtotal_cents: session.amount_subtotal ?? null,
    shipping_cents: session.shipping_cost?.amount_total ?? session.total_details?.amount_shipping ?? 0,
    total_cents: session.amount_total ?? null,
    currency: session.currency || 'usd',
    stripe_session_id: session.id,
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  }).select().single()
  if (error) { console.error('shop order insert error:', error); return }

  // Pull the purchased line items from Stripe and record them (with any Printify
  // mapping carried on the price's product metadata).
  let printifyItems = []
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'], limit: 50 })
    const rows = []
    for (const li of lineItems.data || []) {
      const md = li.price?.product?.metadata || {}
      const qty = li.quantity || 1

      // Bundle: expand into its component Printify line items for fulfillment
      if (md.fulfillment === 'bundle' && md.shop_bundle_id) {
        const { data: bundle } = await supabase
          .from('shop_bundles')
          .select('title, shop_bundle_items(quantity, variant_id, shop_products(printify_product_id, printify_variant_id, variants, fulfillment))')
          .eq('id', md.shop_bundle_id).single()
        if (bundle) {
          for (const bi of bundle.shop_bundle_items || []) {
            const p = bi.shop_products
            if (p?.fulfillment === 'printify' && p.printify_product_id) {
              const vid = bi.variant_id
                ? Number(bi.variant_id)
                : (p.printify_variant_id || p.variants?.[0]?.printify_variant_id || null)
              if (vid) printifyItems.push({ product_id: p.printify_product_id, variant_id: Number(vid), quantity: (bi.quantity || 1) * qty })
            }
          }
        }
        rows.push({
          order_id: order.id,
          product_name: li.description || li.price?.product?.name || 'Bundle',
          quantity: qty,
          unit_price_cents: li.price?.unit_amount ?? 0,
          image_url: li.price?.product?.images?.[0] || null,
          stripe_price_id: li.price?.id || null,
          shop_product_id: null,
          printify_product_id: null,
          printify_variant_id: null,
        })
        continue
      }

      const variantId = md.printify_variant_id ? Number(md.printify_variant_id) : null
      if (md.fulfillment === 'printify' && md.printify_product_id && variantId) {
        printifyItems.push({ product_id: md.printify_product_id, variant_id: variantId, quantity: qty })
      }
      rows.push({
        order_id: order.id,
        product_name: li.description || li.price?.product?.name || 'Item',
        quantity: qty,
        unit_price_cents: li.price?.unit_amount ?? (li.amount_subtotal && li.quantity ? Math.round(li.amount_subtotal / li.quantity) : 0),
        image_url: li.price?.product?.images?.[0] || null,
        stripe_price_id: li.price?.id || null,
        shop_product_id: md.shop_product_id || null,
        printify_product_id: md.printify_product_id || null,
        printify_variant_id: variantId,
      })
    }
    if (rows.length) {
      const { error: oiErr } = await supabase.from('order_items').insert(rows)
      // If the Printify link columns aren't migrated yet, still record the items.
      if (oiErr && /printify_|shop_product_id/.test(oiErr.message || '')) {
        const stripped = rows.map(({ shop_product_id, printify_product_id, printify_variant_id, ...r }) => r)
        await supabase.from('order_items').insert(stripped)
      }
    }
    // Order confirmation email (the "thank you" receipt).
    const buyerEmail = session.customer_details?.email || order.email
    if (buyerEmail) {
      try { await sendStripeEmailOnce({
          eventId,
          type: 'shop_order_confirmation',
          to: buyerEmail,
          send: () => sendOrderConfirmationEmail({
            to: buyerEmail,
            name: order.shipping_name || session.customer_details?.name,
            order,
            items: rows,
          }),
        }) }
      catch (e) { console.error('order confirmation email error:', e.message) }
    }
  } catch (e) { console.error('shop order line items error:', e.message) }

  // Dropship: forward Printify line items to Printify for fulfillment.
  if (printifyItems.length) {
    try { await createPrintifyOrder(supabase, order, session, printifyItems) }
    catch (e) { console.error('printify order error:', e.message) }
  }
}

// Build a Printify order from a paid checkout and record its id/status.
async function createPrintifyOrder(supabase, order, session, lineItems) {
  const { printifyConfigured, resolveShopId, createOrder } = await import('../../../../lib/printify')
  if (!printifyConfigured()) { console.warn('Printify token missing; skipping auto-order'); return }
  const shopId = await resolveShopId()
  if (!shopId) return

  const ship = session.collected_information?.shipping_details || session.shipping_details || session.customer_details || {}
  const a = ship.address || {}
  const fullName = ship.name || session.customer_details?.name || ''
  const [firstName, ...rest] = fullName.trim().split(/\s+/)
  const address_to = {
    first_name: firstName || 'Customer',
    last_name: rest.join(' ') || '—',
    email: session.customer_details?.email || order.email || '',
    phone: session.customer_details?.phone || '',
    country: a.country || 'US',
    region: a.state || '',
    address1: a.line1 || '',
    address2: a.line2 || '',
    city: a.city || '',
    zip: a.postal_code || '',
  }

  const payload = {
    external_id: order.order_number || session.id,
    label: order.order_number || undefined,
    line_items: lineItems,
    shipping_method: 1, // standard
    send_shipping_notification: false,
    address_to,
  }
  const result = await createOrder(shopId, payload)
  const printifyId = result?.id ? String(result.id) : null
  await supabase.from('orders').update({
    printify_order_id: printifyId,
    printify_status: printifyId ? 'submitted' : 'error',
  }).eq('id', order.id)
}

function formatAddress(name, a) {
  return [
    name,
    a.line1,
    a.line2,
    [a.city, a.state].filter(Boolean).join(', '),
    a.postal_code,
    a.country,
  ].filter(Boolean).join('\n')
}

async function handleSubscriptionCheckout(session, eventId) {
  const memberId = session.client_reference_id
  if (!memberId || !session.subscription) throw new Error('Subscription checkout has no linked account')

  const subscription = await stripe.subscriptions.retrieve(session.subscription)
  if (!['active', 'trialing'].includes(subscription.status)) return
  const priceId = subscription.items.data[0]?.price?.id
  const planInfo = PLANS[priceId]
  if (!planInfo) {
    console.error('Unrecognized subscription price id:', priceId)
    return
  }

  const update = {
    plan: planInfo.plan,
    plan_id: planInfo.plan_id,
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    billing_source: 'stripe',   // billed through Stripe (vs. 'wix' migrations)
  }
  // If a shipping address was collected (Printing Press / physical), save it so
  // Settings and future print deliveries stay in sync.
  const ship = session.collected_information?.shipping_details || session.shipping_details || session.customer_details
  if (ship?.address?.line1) update.mailing_address = formatAddress(ship.name, ship.address)

  const supabase = getSupabase()
  const { data: member, error } = await supabase
    .from('members')
    .update(update)
    .eq('id', memberId)
    .select()
    .single()

  if (error) {
    console.error('members plan update error:', error)
    throw new Error('Subscription access could not be saved')
  }

  // Save the subscription's card as the customer default so it shows in Settings.
  if (subscription.default_payment_method) {
    await setDefaultIfUnset(session.customer, subscription.default_payment_method)
  }

  const customer = await stripe.customers.retrieve(session.customer)
  if (customer.email) {
    try {
      await sendStripeEmailOnce({
        eventId,
        type: 'payment_confirmed',
        to: customer.email,
        send: () => sendPaymentConfirmedEmail({
          to: customer.email,
          name: member.full_name || 'there',
          planName: planInfo.plan,
          amount: planInfo.amount,
        }),
      })
    } catch (emailError) {
      console.error('Payment confirmation email tracking failed:', emailError)
    }
  }
}

// Recurring renewal — reaffirm the plan in case access had lapsed.
async function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const priceId = subscription.items.data[0]?.price?.id
  const planInfo = PLANS[priceId]
  if (!planInfo) return

  const supabase = getSupabase()
  const { error } = await supabase
    .from('members')
    .update({ plan: planInfo.plan, plan_id: planInfo.plan_id, billing_source: 'stripe', stripe_subscription_id: invoice.subscription })
    .eq('stripe_customer_id', invoice.customer)

  if (error) console.error('members renewal update error:', error)
}

async function handleInvoicePaymentFailed(invoice, eventId) {
  const supabase = getSupabase()
  const { data: member } = await supabase
    .from('members')
    .select('full_name, plan')
    .eq('stripe_customer_id', invoice.customer)
    .single()
  if (!member) return

  const customer = await stripe.customers.retrieve(invoice.customer)
  if (customer.email) {
    try {
      await sendStripeEmailOnce({
        eventId,
        type: 'payment_failed',
        to: customer.email,
        send: () => sendPaymentFailedEmail({
          to: customer.email,
          name: member.full_name || 'there',
          planName: member.plan,
        }),
      })
    } catch (emailError) {
      console.error('payment_failed email tracking failed:', emailError)
    }
  }
}

async function handleSubscriptionCanceled(subscription, eventId) {
  const supabase = getSupabase()

  // Read the existing plan before clearing it.
  const { data: existing, error: readError } = await supabase
    .from('members')
    .select('full_name, plan')
    .eq('stripe_customer_id', subscription.customer)
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (readError) {
    console.error('members cancellation lookup error:', readError)
    return
  }

  // Ignore stale cancellation events for previous subscriptions.
  if (!existing) return

  const previousPlan = existing.plan

  const { data: member, error } = await supabase
    .from('members')
    .update({
      plan: null,
      plan_id: null,
      stripe_subscription_id: null,
    })
    .eq('stripe_customer_id', subscription.customer)
    .eq('stripe_subscription_id', subscription.id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('members plan reset error:', error)
    return
  }

  if (!member) return

  const customer = await stripe.customers.retrieve(subscription.customer)
  if (customer.email) {
    try {
      await sendStripeEmailOnce({
        eventId,
        type: 'subscription_canceled',
        to: customer.email,
        send: () => sendCancellationEmail({
          to: customer.email,
          name: member.full_name || 'there',
          planName: previousPlan,
        }),
      })
    } catch (emailError) {
      console.error('subscription_canceled email tracking failed:', emailError)
    }
  }
}
// Handles one-time item purchases (article / audio / video unlocks, created
// via /api/create-paywall-checkout) and membership subscriptions (Reader's
// Circle / Printing Press) — signup, renewal, failed payment, and cancellation.
export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    if (session.mode === 'setup') {
      await handleSavedPaymentMethod(session)
    } else if (session.mode === 'payment') {
      // Digital item unlocks carry articleId; everything else that's a physical
      // shop checkout (has shipping, or is tagged shop_order) becomes an order.
      if (session.metadata?.articleId) {
        await fulfillItemPurchase(session)
      } else if (session.metadata?.kind === 'tot_bundle') {
        await handleTotBundle(session, event.id)
      } else if (session.metadata?.kind === 'shop_order' || session.shipping_details?.address || session.collected_information?.shipping_details?.address) {
        await handleShopOrder(session, event.id)
      }
      // Save the card used for any purchase as the default-if-unset, so it
      // auto-populates in Settings.
      if (session.customer && session.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id)
          if (pi?.payment_method) await setDefaultIfUnset(session.customer, pi.payment_method)
        } catch (e) { console.error('purchase default PM failed:', e.message) }
      }
    } else if (session.mode === 'subscription') {
      await handleSubscriptionCheckout(session, event.id)
    }
  }

  if (event.type === 'checkout.session.async_payment_succeeded') {
    if (event.data.object.metadata?.articleId) await fulfillItemPurchase(event.data.object)
    else if (event.data.object.mode === 'subscription') await handleSubscriptionCheckout(event.data.object, event.id)
  }

  if (event.type === 'invoice.payment_succeeded') {
    await handleInvoicePaymentSucceeded(event.data.object)
  }

  if (event.type === 'invoice.payment_failed') {
    await handleInvoicePaymentFailed(event.data.object, event.id)
  }

  if (event.type === 'customer.subscription.deleted') {
    await handleSubscriptionCanceled(event.data.object, event.id)
  }

  return Response.json({ received: true })
}
