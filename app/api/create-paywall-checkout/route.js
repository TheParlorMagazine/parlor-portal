import { itemPriceMatches } from '../../../lib/itemPurchasePrice'
import Stripe from 'stripe'
import { requireUser, serviceClient } from '../../../lib/apiAuth'
import { ensureStripeCustomer } from '../../../lib/stripeCustomer'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)


export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in before purchasing so your access can be saved.' }, { status: 401 })
  try {
    const { stripePriceId, articleId, itemType = 'article' } = await request.json()
    if (!stripePriceId || !articleId || !['article', 'audio', 'video'].includes(itemType)) return Response.json({ error: 'A valid item and price are required.' }, { status: 400 })
    const db = serviceClient()
    const { data: article, error } = await db.from('articles').select('id, slug, published, paywall_type, stripe_price_id, body').eq('id', articleId).single()
    if (error || !article?.published || !itemPriceMatches(article, itemType, stripePriceId)) return Response.json({ error: 'This item is not available for purchase.' }, { status: 400 })
    const articleUrl = new URL(`/post/${encodeURIComponent(article.slug)}`, request.url)
    const cancelUrl = articleUrl.toString()
    const { data: purchased, error: purchaseError } = await db.from('item_purchases').select('id').eq('member_id', user.id).eq('article_id', articleId).eq('item_type', itemType).limit(1).maybeSingle()
    if (purchaseError) throw new Error('Could not check existing purchases')
    if (purchased) return Response.json({ url: cancelUrl, alreadyPurchased: true })
    articleUrl.searchParams.set('unlocked', '1')
    // Stripe replaces this literal placeholder with the paid checkout session.
    const successUrl = articleUrl.toString() + '&checkout_session_id={CHECKOUT_SESSION_ID}'
    const customer = await ensureStripeCustomer(db, stripe, user.id)
    if (!customer) throw new Error('Could not link the purchase to a member account')
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl, cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: { articleId, itemType, userId: user.id },
      customer, payment_intent_data: { setup_future_usage: 'off_session' },
    })
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Item checkout failed:', err.message)
    return Response.json({ error: 'Checkout could not be started. Please try again.' }, { status: 500 })
  }
}
