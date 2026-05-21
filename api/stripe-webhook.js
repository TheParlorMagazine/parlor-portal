const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = async function handler(req, res) {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  switch (event.type) {

    // New subscription created
    case 'customer.subscription.created': {
      const sub = event.data.object
      const customerId = sub.customer
      const planId = sub.items.data[0].price.id

      // Check if customer already has another active subscription
      const existing = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10
      })

      // Cancel any other active subscriptions
      for (const s of existing.data) {
        if (s.id !== sub.id) {
          await stripe.subscriptions.cancel(s.id)
        }
      }

      // Update member plan in Supabase
      await updateMemberPlan(customerId, planId)
      break
    }

    // Subscription upgraded/downgraded
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const planId = sub.items.data[0].price.id
      await updateMemberPlan(sub.customer, planId)
      break
    }

    // Subscription cancelled
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await updateMemberPlan(sub.customer, 'free')
      break
    }
  }

  res.json({ received: true })
}

async function updateMemberPlan(stripeCustomerId, stripePriceId) {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  // Map Stripe price IDs to plan names
  const PLAN_MAP = {
    [process.env.STRIPE_READERS_CIRCLE_PRICE_ID]: "The Reader's Circle",
    [process.env.STRIPE_PRINTING_PRESS_PRICE_ID]: 'The Printing Press',
    'free': 'free'
  }

  const plan = PLAN_MAP[stripePriceId] || 'free'

  await supabase
    .from('members')
    .update({ plan, plan_id: stripePriceId })
    .eq('stripe_customer_id', stripeCustomerId)
}
