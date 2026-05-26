const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { articleId, title, itemType = 'article', price = 2.50 } = req.body
  if (!articleId || !title) {
    return res.status(400).json({ error: 'articleId and title are required' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Return existing IDs if already created
  const { data: article } = await supabase
    .from('articles')
    .select('stripe_product_id, stripe_price_id')
    .eq('id', articleId)
    .single()

  if (article?.stripe_product_id && article?.stripe_price_id) {
    return res.json({
      stripe_product_id: article.stripe_product_id,
      stripe_price_id: article.stripe_price_id,
    })
  }

  // Create Stripe product
  const product = await stripe.products.create({
    name: `${title} — One-Time Access`,
    metadata: { articleId, itemType },
  })

  // Create Stripe price (one-time, not recurring)
  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(parseFloat(price) * 100),
    currency: 'usd',
  })

  // Save IDs back to the article
  await supabase
    .from('articles')
    .update({
      stripe_product_id: product.id,
      stripe_price_id: stripePrice.id,
    })
    .eq('id', articleId)

  return res.json({
    stripe_product_id: product.id,
    stripe_price_id: stripePrice.id,
  })
}
