import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

async function auth(request) {
  const user = await requireUser(request)
  if (!user) return { err: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

// PATCH — update a collection
export async function PATCH(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const body = await request.json().catch(() => ({}))
  const patch = {}
  if ('name'        in body) patch.name        = (body.name || '').trim()
  if ('description' in body) patch.description = (body.description || '').trim() || null
  if ('live'        in body) patch.live        = !!body.live
  if ('sort_order'  in body) patch.sort_order  = body.sort_order
  if ('price'       in body) patch.price       = body.price != null ? Number(body.price) || null : null
  if ('price_eur'   in body) patch.price_eur   = body.price_eur != null ? Number(body.price_eur) || null : null
  if ('price_gbp'   in body) patch.price_gbp   = body.price_gbp != null ? Number(body.price_gbp) || null : null
  if ('ship_line'   in body) patch.ship_line   = (body.ship_line || '').trim() || null
  const { data, error } = await db.from('tot_collections').update(patch)
    .eq('id', params.collectionId).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ collection: data })
}

// DELETE — remove a collection (cascades to houses + treats)
export async function DELETE(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const { error } = await db.from('tot_collections').delete().eq('id', params.collectionId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
