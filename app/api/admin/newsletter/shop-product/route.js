import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

// GET → list all shop products (id, name, variant, price, images) for the picker.
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

// PATCH { productId } → set newsletter_featured on that product (clears all others first).
// PATCH { productId: null } → clear the featured product.
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => ({}))
  await db.from('shop_products').update({ newsletter_featured: false }).eq('newsletter_featured', true)
  if (b.productId) {
    const { error } = await db.from('shop_products').update({ newsletter_featured: true }).eq('id', b.productId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}
