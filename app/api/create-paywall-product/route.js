import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const { articleId, title, itemType, price } = await request.json()

  if (!title?.trim()) {
    return Response.json({ error: 'title is required' }, { status: 400 })
  }

  const amount = Math.round(parseFloat(price) * 100)
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: 'price must be a positive number' }, { status: 400 })
  }

  try {
    const product = await stripe.products.create({
      name: title.trim(),
      metadata: { ...(articleId ? { articleId } : {}), itemType: itemType || 'article' },
    })

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'usd',
    })

    // Only articles are persisted server-side here — block-level (audio/video)
    // ids are stored on the TipTap node itself and saved with the article body.
    if (articleId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { error } = await supabase
        .from('articles')
        .update({ stripe_product_id: product.id, stripe_price_id: stripePrice.id })
        .eq('id', articleId)

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
    }

    return Response.json({ stripe_product_id: product.id, stripe_price_id: stripePrice.id })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
