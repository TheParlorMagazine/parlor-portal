import Stripe from 'stripe'
import { requireUser } from '../../../../lib/apiAuth'
import { fulfillItemPurchase } from '../../../../lib/itemPurchase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// No charges are created here. Match an existing paid digital checkout to its
// owner or, for old guest checkout, the buyer's verified email address.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in to recover your purchase.' }, { status: 401 })
  if (!user.email_confirmed_at) return Response.json({ error: 'Verify your account email before recovering a purchase.' }, { status: 403 })
  let reference
  try { reference = (await request.json()).reference?.trim() } catch {}
  if (typeof reference !== 'string' || !/^(cs_|pi_)[a-zA-Z0-9_]+$/.test(reference)) return Response.json({ error: 'Enter a Stripe Checkout session ID (cs_…) or payment ID (pi_…).' }, { status: 400 })
  try {
    const session = reference.startsWith('cs_')
      ? await stripe.checkout.sessions.retrieve(reference)
      : (await stripe.checkout.sessions.list({ payment_intent: reference, limit: 1 })).data[0]
    if (!session) throw new Error('No checkout')
    const result = await fulfillItemPurchase(session, { user })
    if (result.status !== 'confirmed') return Response.json({ error: 'This payment is not ready to recover. Confirm it succeeded and sign in with the email used at checkout.' }, { status: 409 })
    return Response.json({ url: `/post/${encodeURIComponent(result.slug)}`, message: 'Your purchase is recovered. No additional payment was taken.' })
  } catch {
    return Response.json({ error: 'We couldn’t recover this purchase. Check the payment ID and use the account matching the checkout email, or contact us. Please don’t pay again.' }, { status: 409 })
  }
}
