const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { stripePriceId, articleId, itemType = 'article', userId, successUrl, cancelUrl } = req.body
  if (!stripePriceId || !articleId) {
    return res.status(400).json({ error: 'stripePriceId and articleId are required' })
  }

  const origin = req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL || ''

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: successUrl || `${origin}?unlocked=true`,
    cancel_url: cancelUrl || origin,
    client_reference_id: userId || undefined,
    metadata: {
      articleId,
      itemType,
    },
  })

  return res.json({ url: session.url })
}
