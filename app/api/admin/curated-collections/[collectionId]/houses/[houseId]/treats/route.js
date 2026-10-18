import { requireUser, serviceClient, memberOf } from '../../../../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

async function auth(request) {
  const user = await requireUser(request)
  if (!user) return { err: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

// POST — add a treat to a house
export async function POST(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const body = await request.json().catch(() => ({}))
  const { data, error } = await db.from('tot_treats').insert({
    house_id: params.houseId,
    name: (body.name || '').trim(),
    note: (body.note || '').trim() || null,
    stock: Number(body.stock) || 0,
    sort_order: body.sort_order ?? 0,
    active: body.active ?? true,
    product_id: body.product_id || null,
  }).select('*, shop_products(id, name, images, inventory)').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ treat: data })
}
