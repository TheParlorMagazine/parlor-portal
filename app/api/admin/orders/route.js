import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { sendOrderShippedEmail } from '../../../../lib/emails'

const ORDER_ROLES = ['admin', 'finance_admin']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ORDER_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

const STATUSES = ['processing', 'shipped', 'fulfilled', 'cancelled']

// GET → all orders (newest first) with items + the member's name/email.
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g

  const { data: orders, error } = await db
    .from('orders')
    .select('*, members!orders_member_id_fkey(full_name, email)')
    .order('placed_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const ids = (orders || []).map(o => o.id)
  let byOrder = {}
  if (ids.length) {
    const { data: items } = await db.from('order_items').select('*').in('order_id', ids)
    for (const it of items || []) (byOrder[it.order_id] ||= []).push(it)
  }
  const out = (orders || []).map(o => ({
    ...o,
    member_name: o.members?.full_name || null,
    member_email: o.members?.email || o.email || null,
    members: undefined,
    items: byOrder[o.id] || [],
  }))
  return Response.json({ orders: out })
}

// POST → create a manual order (e.g. an order placed outside Stripe). Body:
// { member_id?, email?, shipping_name?, shipping_address?, items:[{product_name, variant?, quantity?, unit_price_cents?, image_url?}], shipping_cents? }
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const b = await request.json().catch(() => ({}))

  const items = Array.isArray(b.items) ? b.items.filter(i => i.product_name) : []
  const subtotal = items.reduce((s, i) => s + (Number(i.unit_price_cents) || 0) * (Number(i.quantity) || 1), 0)
  const shipping = Number(b.shipping_cents) || 0

  // Friendly sequential order number (PARLOR-1000, 1001, …).
  let orderNumber = null
  try { const { data: n } = await db.rpc('next_order_number'); if (n) orderNumber = n } catch {}

  const { data: order, error } = await db.from('orders').insert({
    member_id: b.member_id || null,
    email: b.email || null,
    order_number: orderNumber,
    status: 'processing',
    shipping_name: b.shipping_name || null,
    shipping_address: b.shipping_address || null,
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    total_cents: subtotal + shipping,
    admin_note: b.admin_note || null,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (items.length) {
    await db.from('order_items').insert(items.map(i => ({
      order_id: order.id,
      product_name: i.product_name,
      variant: i.variant || null,
      quantity: Number(i.quantity) || 1,
      unit_price_cents: Number(i.unit_price_cents) || 0,
      image_url: i.image_url || null,
    })))
  }
  return Response.json({ order })
}

// PATCH → update fulfillment status / tracking. Body: { id, status?, carrier?,
// tracking_number?, tracking_url?, admin_note?, notify? }
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const b = await request.json().catch(() => ({}))
  if (!b.id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const { data: existing } = await db.from('orders')
    .select('*, members!orders_member_id_fkey(full_name, email)').eq('id', b.id).single()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const patch = {}
  if (b.status && STATUSES.includes(b.status)) patch.status = b.status
  if ('carrier' in b) patch.carrier = b.carrier || null
  if ('tracking_number' in b) patch.tracking_number = b.tracking_number || null
  if ('tracking_url' in b) patch.tracking_url = b.tracking_url || null
  if ('admin_note' in b) patch.admin_note = b.admin_note || null

  // Stamp lifecycle timestamps on first transition.
  const now = new Date().toISOString()
  if (patch.status === 'shipped' && !existing.shipped_at) patch.shipped_at = now
  if (patch.status === 'fulfilled') {
    if (!existing.shipped_at && !patch.shipped_at) patch.shipped_at = now
    if (!existing.fulfilled_at) patch.fulfilled_at = now
  }

  const { data: order, error } = await db.from('orders').update(patch).eq('id', b.id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Notify the buyer when the order first ships (best-effort).
  const nowShipped = patch.status === 'shipped' && existing.status !== 'shipped'
  const to = existing.members?.email || existing.email
  if (b.notify !== false && nowShipped && to) {
    try {
      await sendOrderShippedEmail({ to, name: existing.members?.full_name || '', order: { ...order } })
    } catch (e) { console.error('order shipped email failed:', e.message) }
  }
  return Response.json({ order })
}

// DELETE → remove an order (?id=). Items cascade.
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await db.from('orders').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
