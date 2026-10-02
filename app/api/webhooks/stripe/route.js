import Stripe from 'stripe'
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

async function handleOneTimePurchase(session) {
  const { articleId, itemType, userId } = session.metadata || {}
  if (!articleId || !itemType) return

  const supabase = getSupabase()
  let memberId = userId || session.client_reference_id

  // Fall back to looking the member up by Stripe customer if
  // client_reference_id wasn't set on this session for some reason.
  if (!memberId && session.customer) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('stripe_customer_id', session.customer)
      .single()
    memberId = member?.id
  }
  if (!memberId) return

  const { error } = await supabase
    .from('item_purchases')
    .insert({ member_id: memberId, article_id: articleId, item_type: itemType })

  // Ignore duplicate-purchase inserts (e.g. webhook retries); surface anything else
  if (error && error.code !== '23505') {
    console.error('item_purchases insert error:', error)
  }
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

// Shop purchases (physical merch/print) → create an order the member can track
// in the portal. Triggered by a mode=payment checkout carrying shipping (or a
// metadata.kind of 'shop_order'), as opposed to digital item unlocks above.
async function handleShopOrder(session) {
  const supabase = getSupabase()

  // Dedupe webhook retries on the checkout session.
  const { data: dupe } = await supabase.from('orders').select('id').eq('stripe_session_id', session.id).maybeSingle()
  if (dupe) return

  let memberId = session.metadata?.userId || session.client_reference_id || null
  if (!memberId && session.customer) {
    const { data: m } = await supabase.from('members').select('id').eq('stripe_customer_id', session.customer).single()
    memberId = m?.id || null
  }

  // Stripe moved shipping to collected_information.shipping_details (newer API);
  // fall back to the legacy field and then billing details.
  const ship = session.collected_information?.shipping_details || session.shipping_details || session.customer_details || {}
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
    const rows = (lineItems.data || []).map(li => {
      const md = li.price?.product?.metadata || {}
      const variantId = md.printify_variant_id ? Number(md.printify_variant_id) : null
      if (md.fulfillment === 'printify' && md.printify_product_id && variantId) {
        printifyItems.push({ product_id: md.printify_product_id, variant_id: variantId, quantity: li.quantity || 1 })
      }
      return {
        order_id: order.id,
        product_name: li.description || li.price?.product?.name || 'Item',
        quantity: li.quantity || 1,
        unit_price_cents: li.price?.unit_amount ?? (li.amount_subtotal && li.quantity ? Math.round(li.amount_subtotal / li.quantity) : 0),
        image_url: li.price?.product?.images?.[0] || null,
        stripe_price_id: li.price?.id || null,
        shop_product_id: md.shop_product_id || null,
        printify_product_id: md.printify_product_id || null,
        printify_variant_id: variantId,
      }
    })
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
      try { await sendOrderConfirmationEmail({ to: buyerEmail, name: order.shipping_name || session.customer_details?.name, order, items: rows }) }
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

async function handleSubscriptionCheckout(session) {
  const memberId = session.client_reference_id
  if (!memberId || !session.subscription) return

  const subscription = await stripe.subscriptions.retrieve(session.subscription)
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
    return
  }

  // Save the subscription's card as the customer default so it shows in Settings.
  if (subscription.default_payment_method) {
    await setDefaultIfUnset(session.customer, subscription.default_payment_method)
  }

  const customer = await stripe.customers.retrieve(session.customer)
  if (customer.email) {
    await sendPaymentConfirmedEmail({
      to: customer.email,
      name: member.full_name || 'there',
      planName: planInfo.plan,
      amount: planInfo.amount,
    })
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
    .update({ plan: planInfo.plan, plan_id: planInfo.plan_id })
    .eq('stripe_customer_id', invoice.customer)

  if (error) console.error('members renewal update error:', error)
}

async function handleInvoicePaymentFailed(invoice) {
  const supabase = getSupabase()
  const { data: member } = await supabase
    .from('members')
    .select('full_name, plan')
    .eq('stripe_customer_id', invoice.customer)
    .single()
  if (!member) return

  const customer = await stripe.customers.retrieve(invoice.customer)
  if (customer.email) {
    await sendPaymentFailedEmail({
      to: customer.email,
      name: member.full_name || 'there',
      planName: member.plan,
    })
  }
}

async function handleSubscriptionCanceled(subscription) {
  const supabase = getSupabase()
  const { data: member, error } = await supabase
    .from('members')
    .update({ plan: null, plan_id: null })
    .eq('stripe_customer_id', subscription.customer)
    .select()
    .single()

  if (error) {
    console.error('members plan reset error:', error)
    return
  }

  const customer = await stripe.customers.retrieve(subscription.customer)
  if (customer.email && member) {
    await sendCancellationEmail({
      to: customer.email,
      name: member.full_name || 'there',
      planName: member.plan,
    })
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
        await handleOneTimePurchase(session)
      } else if (session.metadata?.kind === 'shop_order' || session.shipping_details?.address || session.collected_information?.shipping_details?.address) {
        await handleShopOrder(session)
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
      await handleSubscriptionCheckout(session)
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    await handleInvoicePaymentSucceeded(event.data.object)
  }

  if (event.type === 'invoice.payment_failed') {
    await handleInvoicePaymentFailed(event.data.object)
  }

  if (event.type === 'customer.subscription.deleted') {
    await handleSubscriptionCanceled(event.data.object)
  }

  return Response.json({ received: true })
}
