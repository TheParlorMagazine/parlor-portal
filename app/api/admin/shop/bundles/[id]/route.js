import { requireUser, serviceClient, memberOf } from '../../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

function validateProviders(products, items) {
  const byId = new Map((products || []).map(p => [p.id, p]))
  const printifyProviders = new Set()
  for (const it of items) {
    const p = byId.get(it.product_id)
    if (!p) continue
    if (p.fulfillment === 'printify' && p.print_provider_id) {
      printifyProviders.add(p.print_provider_id)
    }
  }
  if (printifyProviders.size > 1) {
    return 'All Printify items in a bundle must share the same print provider.'
  }
  return null
}

// PATCH → update bundle metadata + replace items
export async function PATCH(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  const { id } = await params
  let body = {}; try { body = await request.json() } catch {}
  const { title, description, price, images, category, active, sort, items } = body

  if (title !== undefined && !title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 })
  if (price !== undefined && Number(price) <= 0) return Response.json({ error: 'Price must be positive' }, { status: 400 })

  if (Array.isArray(items)) {
    if (items.length < 2) return Response.json({ error: 'A bundle needs at least 2 items' }, { status: 400 })
    const productIds = items.map(i => i.product_id).filter(Boolean)
    const { data: products } = await g.db.from('shop_products')
      .select('id, print_provider_id, fulfillment').in('id', productIds)
    const providerErr = validateProviders(products, items)
    if (providerErr) return Response.json({ error: providerErr }, { status: 400 })
  }

  const patch = {}
  if (title !== undefined) patch.title = title.trim()
  if (description !== undefined) patch.description = description || null
  if (price !== undefined) patch.price = Number(price)
  if (images !== undefined) patch.images = images || []
  if (category !== undefined) patch.category = category || null
  if (active !== undefined) patch.active = !!active
  if (sort !== undefined) patch.sort = Number(sort) || 0

  if (Object.keys(patch).length) {
    const { error } = await g.db.from('shop_bundles').update(patch).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  if (Array.isArray(items)) {
    await g.db.from('shop_bundle_items').delete().eq('bundle_id', id)
    const rows = items.map((it, idx) => ({
      bundle_id: id, product_id: it.product_id,
      variant_id: it.variant_id || null, quantity: Math.max(1, Number(it.quantity) || 1), sort: idx,
    }))
    await g.db.from('shop_bundle_items').insert(rows)
  }

  return Response.json({ ok: true })
}

// DELETE → remove bundle (items cascade)
export async function DELETE(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  const { id } = await params
  const { error } = await g.db.from('shop_bundles').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
