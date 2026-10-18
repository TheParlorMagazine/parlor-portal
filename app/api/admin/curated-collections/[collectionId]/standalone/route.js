import { requireUser, serviceClient, memberOf } from '../../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

async function auth(request) {
  const user = await requireUser(request)
  if (!user) return { err: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

// GET — list standalone products for a collection
export async function GET(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const { data, error } = await db
    .from('tot_collection_products')
    .select('id, sort_order, product_id, shop_products(id, name, images, price, active)')
    .eq('collection_id', params.collectionId)
    .order('sort_order')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data || [] })
}

// POST — add a standalone product
export async function POST(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const body = await request.json().catch(() => ({}))
  const { data, error } = await db
    .from('tot_collection_products')
    .insert({ collection_id: params.collectionId, product_id: body.product_id, sort_order: body.sort_order ?? 0 })
    .select('id, sort_order, product_id, shop_products(id, name, images, price, active)')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ item: data })
}
