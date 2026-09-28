import { requireUser, serviceClient } from '../../../../lib/apiAuth'

// GET → the signed-in member's shop orders, newest first, each with its items.
// Read-only: members track status/tracking here but can't change orders.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const db = serviceClient()
  const { data: orders, error } = await db
    .from('orders')
    .select('id, order_number, status, carrier, tracking_number, tracking_url, shipping_name, shipping_address, subtotal_cents, shipping_cents, total_cents, currency, placed_at, shipped_at, fulfilled_at')
    .eq('member_id', user.id)
    .order('placed_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const ids = (orders || []).map(o => o.id)
  let itemsByOrder = {}
  if (ids.length) {
    const { data: items } = await db
      .from('order_items')
      .select('order_id, product_name, variant, quantity, unit_price_cents, image_url')
      .in('order_id', ids)
    for (const it of items || []) (itemsByOrder[it.order_id] ||= []).push(it)
  }

  const out = (orders || []).map(o => ({ ...o, items: itemsByOrder[o.id] || [] }))
  return Response.json({ orders: out })
}
