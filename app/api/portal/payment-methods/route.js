import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../../lib/apiAuth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Returns the member's saved card(s) on file with Stripe, so Settings can show
// what they're billed on. Raw card data never touches our app — Stripe only
// hands back the brand/last4/expiry. Managing the card happens in the hosted
// Billing Portal (see /api/portal/billing-portal).
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const db = serviceClient()
  const { data: member } = await db
    .from('members').select('stripe_customer_id').eq('id', user.id).single()

  if (!member?.stripe_customer_id) {
    return Response.json({ hasBilling: false, methods: [] })
  }

  try {
    // The method Stripe charges for invoices/subscriptions is the customer's
    // default payment method.
    const customer = await stripe.customers.retrieve(member.stripe_customer_id)
    const defaultPm = customer?.invoice_settings?.default_payment_method || null

    // All saved methods, regardless of type (cards + wallets + PayPal).
    const list = await stripe.paymentMethods.list({
      customer: member.stripe_customer_id,
      limit: 20,
    })

    const methods = (list.data || []).map(pm => {
      const base = { id: pm.id, type: pm.type, isDefault: pm.id === defaultPm }
      if (pm.type === 'card' && pm.card) {
        // Apple Pay / Google Pay tokenize a card — surface the wallet.
        const wallet = pm.card.wallet?.type || null // apple_pay | google_pay | link | ...
        return { ...base, brand: pm.card.brand || 'card', last4: pm.card.last4 || '••••', exp_month: pm.card.exp_month || null, exp_year: pm.card.exp_year || null, wallet }
      }
      if (pm.type === 'paypal') {
        return { ...base, paypal_email: pm.paypal?.payer_email || null }
      }
      // Any other saved method (e.g. bank) — show the type generically.
      return base
    })
    // Surface the default first.
    methods.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))

    return Response.json({ hasBilling: true, methods })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
