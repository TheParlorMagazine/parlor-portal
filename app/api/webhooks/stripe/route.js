import Stripe from 'stripe'
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

  const supabase = getSupabase()
  const { data: member, error } = await supabase
    .from('members')
    .update({
      plan: planInfo.plan,
      plan_id: planInfo.plan_id,
      stripe_customer_id: session.customer,
    })
    .eq('id', memberId)
    .select()
    .single()

  if (error) {
    console.error('members plan update error:', error)
    return
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
    if (session.mode === 'payment') {
      await handleOneTimePurchase(session)
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
