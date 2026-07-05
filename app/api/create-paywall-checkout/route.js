import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const { stripePriceId, articleId, itemType, userId, successUrl, cancelUrl } = await request.json()

  if (!stripePriceId || !successUrl || !cancelUrl) {
    return Response.json({ error: 'stripePriceId, successUrl, and cancelUrl are required' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId || undefined,
      metadata: {
        articleId: articleId || '',
        itemType: itemType || 'article',
        userId: userId || '',
      },
    })

    return Response.json({ url: session.url })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
