import Stripe from 'stripe'
import { fulfillItemPurchase } from './itemPurchase'

export async function confirmItemCheckout(sessionId, user, articleId) {
  if (!user) return { status: 'sign_in' }
  if (typeof sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return { status: 'error' }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return await fulfillItemPurchase(session, { user, articleId })
  } catch (error) {
    console.error('Could not confirm item checkout:', error.message)
    return { status: 'error' }
  }
}
