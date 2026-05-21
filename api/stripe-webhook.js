const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const PLAN_MAP = {
    [process.env.STRIPE_READERS_CIRCLE_PRICE_ID]: {
      name: "The Reader's Circle",
      amount: 10
    },
    [process.env.STRIPE_PRINTING_PRESS_PRICE_ID]: {
      name: 'The Printing Press',
      amount: 25
    }
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.mode !== 'subscription') break

      // Get the subscription to find the price
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      )
      const priceId = subscription.items.data[0].price.id
      const plan = PLAN_MAP[priceId]
      if (!plan) break

      // Get customer email
      const customer = await stripe.customers.retrieve(session.customer)
      const email = customer.email

      // Update member in Supabase
      const { data: member } = await supabase
        .from('members')
        .update({
          plan: plan.name,
          plan_id: priceId,
          stripe_customer_id: session.customer
        })
        .eq('id', session.client_reference_id)
        .select()
        .single()

      // Send confirmation email
      if (email && member) {
        const { sendPaymentConfirmedEmail } = await import('../lib/emails.js')
        await sendPaymentConfirmedEmail({
          to: email,
          name: member.full_name || 'there',
          planName: plan.name,
          amount: plan.amount
        })
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object
      if (!invoice.subscription) break
      // Recurring payment succeeded — keep access active
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription
      )
      const priceId = subscription.items.data[0].price.id
      const plan = PLAN_MAP[priceId]
      if (!plan) break

      await supabase
        .from('members')
        .update({ plan: plan.name, plan_id: priceId })
        .eq('stripe_customer_id', invoice.customer)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const customer = await stripe.customers.retrieve(invoice.customer)

      // Find member
      const { data: member } = await supabase
        .from('members')
        .select('full_name, plan')
        .eq('stripe_customer_id', invoice.customer)
        .single()

      if (customer.email && member) {
        const { sendPaymentFailedEmail } = await import('../lib/emails.js')
        await sendPaymentFailedEmail({
          to: customer.email,
          name: member.full_name || 'there',
          planName: member.plan
        })
      }
      break
    }
  }

  res.json({ received: true })
}
