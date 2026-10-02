import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

const STRINGS = ['name', 'variant', 'description', 'category', 'tint', 'sku', 'fulfillment', 'external_url', 'stripe_price_id', 'printify_shop_id', 'printify_product_id']
const NUMBERS = ['price', 'price_eur', 'price_gbp', 'sort', 'inventory', 'printify_variant_id']
const BOOLS = ['active', 'featured']

function pick(b) {
  const out = {}
  for (const f of STRINGS) if (f in b) out[f] = b[f] === '' ? null : b[f]
  for (const f of NUMBERS) if (f in b) out[f] = (b[f] === '' || b[f] == null) ? null : Number(b[f])
  for (const f of BOOLS) if (f in b) out[f] = !!b[f]
  if ('images' in b) out.images = Array.isArray(b.images) ? b.images.filter(Boolean) : []
  if ('variants' in b) out.variants = b.variants ?? null
  if ('printify_data' in b) out.printify_data = b.printify_data ?? null
  // price is NOT NULL — default to 0 rather than null
  if ('price' in out && out.price == null) out.price = 0
  if ('fulfillment' in out && !out.fulfillment) out.fulfillment = 'manual'
  return out
}

// GET → all products (admin view, includes inactive), newest sort first
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { data, error } = await g.db.from('shop_products').select('*')
    .order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ products: data || [] })
}

// POST { ...fields } → create
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  const patch = pick(b)
  if (!patch.name) return Response.json({ error: 'name required' }, { status: 400 })
  const { data, error } = await g.db.from('shop_products').insert(patch).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ product: data })
}

// PATCH { id, ...fields } → update
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const patch = pick(b)
  const { data, error } = await g.db.from('shop_products').update(patch).eq('id', b.id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ product: data })
}

// DELETE { id } → remove
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { error } = await g.db.from('shop_products').delete().eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
