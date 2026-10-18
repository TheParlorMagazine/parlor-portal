import { requireUser, serviceClient, memberOf } from '../../../../../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

async function auth(request) {
  const user = await requireUser(request)
  if (!user) return { err: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

// PATCH — update a treat
export async function PATCH(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const body = await request.json().catch(() => ({}))
  const patch = {}
  if ('name'       in body) patch.name       = (body.name || '').trim()
  if ('note'       in body) patch.note       = (body.note || '').trim() || null
  if ('stock'      in body) patch.stock      = Number(body.stock) || 0
  if ('share_img'  in body) patch.share_img  = body.share_img || null
  if ('sort_order' in body) patch.sort_order = body.sort_order
  if ('active'     in body) patch.active     = !!body.active
  if ('product_id' in body) patch.product_id = body.product_id || null
  const { data, error } = await db.from('tot_treats').update(patch)
    .eq('id', params.treatId).eq('house_id', params.houseId)
    .select('*, shop_products(id, name, images, inventory)').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ treat: data })
}

// DELETE — remove a treat
export async function DELETE(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const { error } = await db.from('tot_treats').delete()
    .eq('id', params.treatId).eq('house_id', params.houseId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
