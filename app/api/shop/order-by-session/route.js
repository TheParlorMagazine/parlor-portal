import { serviceClient } from '../../../../lib/apiAuth'

// GET ?session_id=cs_... → the order for that Stripe checkout session (for the
// confirmation page). The session id is unguessable, so this acts as a receipt
// link; only non-sensitive summary fields are returned.
export async function GET(request) {
  const sessionId = new URL(request.url).searchParams.get('session_id')
  if (!sessionId) return Response.json({ order: null })
  const db = serviceClient()
  const { data: order } = await db.from('orders')
    .select('id, order_number, status, subtotal_cents, shipping_cents, total_cents, currency, shipping_name, shipping_address, placed_at')
    .eq('stripe_session_id', sessionId).maybeSingle()
  if (!order) return Response.json({ order: null })
  const { data: items } = await db.from('order_items')
    .select('product_name, variant, quantity, unit_price_cents, image_url')
    .eq('order_id', order.id)
  return Response.json({ order: { ...order, items: items || [] } })
}
