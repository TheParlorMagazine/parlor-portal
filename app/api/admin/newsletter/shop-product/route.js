import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

// GET → list all active shop products for the picker.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await db.from('shop_products')
    .select('id, name, variant, price, images, newsletter_featured')
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ products: data || [] })
}

// PATCH { productId, selected } → toggle one product in/out of the newsletter grid.
// Up to 3 products may be featured at once; selecting a 4th has no effect.
// PATCH { clearAll: true } → remove all featured products.
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => ({}))

  if (b.clearAll) {
    await db.from('shop_products').update({ newsletter_featured: false }).eq('newsletter_featured', true)
    return Response.json({ ok: true })
  }

  if (!b.productId) return Response.json({ error: 'productId required' }, { status: 400 })

  if (b.selected) {
    // Check how many are already featured
    const { count } = await db.from('shop_products').select('id', { count: 'exact', head: true }).eq('newsletter_featured', true)
    if ((count || 0) >= 3) return Response.json({ error: 'max3', ok: false })
    const { error } = await db.from('shop_products').update({ newsletter_featured: true }).eq('id', b.productId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  } else {
    await db.from('shop_products').update({ newsletter_featured: false }).eq('id', b.productId)
  }

  return Response.json({ ok: true })
}
