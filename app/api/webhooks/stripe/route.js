import { notifyAdminPaidSubscription } from '../../../../lib/adminNotifications'
import { observeStripeCheckout } from '../../../../lib/checkoutReservations'
import { fulfillShopPurchase } from '../../../../lib/fulfillShopPurchase'
import { fulfillItemPurchase } from '../../../../lib/itemPurchase'
import Stripe from 'stripe'
import { sendStripeEmailOnce } from '../../../../lib/stripeEmail'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentConfirmedEmail, sendPaymentFailedEmail, sendCancellationEmail } from '../../../../lib/emails'

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
      const receipt = await sendStripeEmailOnce({
        eventId: session.id,
        type: 'payment_confirmed',
        to: customer.email,
        send: () => sendPaymentConfirmedEmail({
          to: customer.email,
          name: member.full_name || 'there',
          planName: planInfo.plan,
          amount: planInfo.amount,
        }),
      })
      if (receipt?.trackingStatus === 'failed') throw new Error('Subscription receipt rejected; retry required')
    } catch (emailError) {
      console.error('Payment confirmation email tracking failed:', emailError)
      throw emailError
    }
  }
  await notifyAdminPaidSubscription({ session, subscription, member, planName: planInfo.plan })
}

// Recurring renewal — reaffirm the plan in case access had lapsed.
async function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  if (!['active', 'trialing'].includes(subscription.status)) return
  const priceId = subscription.items.data[0]?.price?.id
  const planInfo = PLANS[priceId]
  if (!planInfo) return

  const supabase = getSupabase()
  const { error } = await supabase
    .from('members')
    .update({ plan: planInfo.plan, plan_id: planInfo.plan_id, billing_source: 'stripe', stripe_subscription_id: invoice.subscription })
    .eq('stripe_customer_id', invoice.customer)
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw new Error('Subscription renewal could not be saved')
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
    .select('full_name, plan, stripe_subscription_id, billing_source')
    .eq('stripe_customer_id', subscription.customer)
    .maybeSingle()

  if (readError) {
    console.error('members cancellation lookup error:', readError)
    throw new Error('Subscription cancellation could not be checked')
  }

  // Ignore stale cancellation events for previous subscriptions.
  if (!existing || (existing.stripe_subscription_id && existing.stripe_subscription_id !== subscription.id)) return
  // A replay after clearing this Stripe subscription may still need to retry
  // an explicitly rejected receipt. Never clear a replacement/external plan.
  if (!existing.stripe_subscription_id && (existing.billing_source !== 'stripe' || existing.plan)) return
  const previousPlan = PLANS[subscription.items?.data?.[0]?.price?.id]?.plan || existing.plan || 'your subscription'

  const { data: member, error } = existing.stripe_subscription_id ? await supabase
    .from('members')
    .update({
      plan: null,
      plan_id: null,
      stripe_subscription_id: null,
    })
    .eq('stripe_customer_id', subscription.customer)
    .eq('stripe_subscription_id', subscription.id)
    .select()
    .maybeSingle() : { data: existing, error: null }

  if (error) throw new Error('Subscription cancellation could not be saved')

  if (!member) return

  const customer = await stripe.customers.retrieve(subscription.customer)
  if (customer.email) {
    try {
      const receipt = await sendStripeEmailOnce({
        eventId: subscription.id,
        type: 'subscription_canceled',
        to: customer.email,
        send: () => sendCancellationEmail({
          to: customer.email,
          name: member.full_name || 'there',
          planName: previousPlan,
        }),
      })
      if (receipt?.trackingStatus === 'failed') throw new Error('Cancellation receipt rejected; retry required')
    } catch (emailError) {
      console.error('subscription_canceled email tracking failed:', emailError)
      throw emailError
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

  if (['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)) {
    const object=event.data.object
    if(object.metadata?.reservation_id) {
      const db=getSupabase()
      const {data:row,error}=await db.from('checkout_reservations').select('*').eq('id',object.metadata.reservation_id).single()
      if(error || !row)throw new Error('Checkout allocation could not be loaded')
      const current=await observeStripeCheckout(db,stripe,row,{id:object.id})
      if(current.payment_status==='paid' && current.status==='complete') {
        if(current.metadata?.articleId)await fulfillItemPurchase(current,{retryReceipt:true})
        else await fulfillShopPurchase(stripe,current,{retryReceipt:true})
      }
    }
  }
  if (event.type==='checkout.session.completed' && event.data.object.payment_status!=='paid' && event.data.object.metadata?.reservation_id) {
    const object=event.data.object,db=getSupabase()
    const {data:row,error}=await db.from('checkout_reservations').select('*').eq('id',object.metadata.reservation_id).single()
    if(error || !row)throw new Error('Checkout allocation could not be loaded')
    await observeStripeCheckout(db,stripe,row,{id:object.id})
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    if (session.mode === 'setup') {
      await handleSavedPaymentMethod(session)
    } else if (session.mode === 'payment') {
      // Digital item unlocks carry articleId; everything else that's a physical
      // shop checkout (has shipping, or is tagged shop_order) becomes an order.
      if (session.metadata?.articleId) {
        await fulfillItemPurchase(session, { retryReceipt: true })
      } else if (session.metadata?.kind === 'tot_bundle') {
        await fulfillShopPurchase(stripe, session, { retryReceipt: true })
      } else if (session.metadata?.kind === 'shop_order' || session.shipping_details?.address || session.collected_information?.shipping_details?.address) {
        await fulfillShopPurchase(stripe, session, { retryReceipt: true })
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
    if (event.data.object.metadata?.articleId) await fulfillItemPurchase(event.data.object, { retryReceipt: true })
    else if (['shop_order','tot_bundle'].includes(event.data.object.metadata?.kind)) await fulfillShopPurchase(stripe,event.data.object,{ retryReceipt: true })
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
