import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

// GET → all bundles with their items (admin view, includes inactive)
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { data: bundles, error } = await g.db.from('shop_bundles')
    .select('*, shop_bundle_items(*, shop_products(id, name, price, images, print_provider_id, fulfillment))')
    .order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ bundles: bundles || [] })
}

// POST → create a new bundle with its items
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  let body = {}; try { body = await request.json() } catch {}
  const { title, description, price, images, category, active, sort, items } = body
  if (!title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 })
  if (!price || Number(price) <= 0) return Response.json({ error: 'Price is required' }, { status: 400 })
  if (!Array.isArray(items) || items.length < 2) return Response.json({ error: 'A bundle needs at least 2 items' }, { status: 400 })

  // Validate all Printify items share the same provider
  const productIds = items.map(i => i.product_id).filter(Boolean)
  const { data: products } = await g.db.from('shop_products')
    .select('id, print_provider_id, fulfillment').in('id', productIds)
  const providerErr = validateProviders(products, items)
  if (providerErr) return Response.json({ error: providerErr }, { status: 400 })

  const { data: bundle, error } = await g.db.from('shop_bundles')
    .insert({ title: title.trim(), description: description || null, price: Number(price), images: images || [], category: category || null, active: !!active, sort: Number(sort) || 0 })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = items.map((it, idx) => ({
    bundle_id: bundle.id, product_id: it.product_id,
    variant_id: it.variant_id || null, quantity: Math.max(1, Number(it.quantity) || 1), sort: idx,
  }))
  await g.db.from('shop_bundle_items').insert(rows)
  return Response.json({ bundle }, { status: 201 })
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
    return 'All Printify items in a bundle must share the same print provider (they ship together). Split into separate bundles by provider.'
  }
  return null
}
