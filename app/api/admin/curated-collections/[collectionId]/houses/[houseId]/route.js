import { requireUser, serviceClient, memberOf } from '../../../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

async function auth(request) {
  const user = await requireUser(request)
  if (!user) return { err: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

// PATCH — update a house
export async function PATCH(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const body = await request.json().catch(() => ({}))
  const patch = {}
  if ('name'        in body) patch.name        = (body.name || '').trim()
  if ('description' in body) patch.description = (body.description || '').trim() || null
  if ('sort_order'  in body) patch.sort_order  = body.sort_order
  if ('active'      in body) patch.active      = !!body.active
  const { data, error } = await db.from('tot_houses').update(patch)
    .eq('id', params.houseId).eq('collection_id', params.collectionId).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ house: data })
}

// DELETE — remove a house (cascades to treats)
export async function DELETE(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const { error } = await db.from('tot_houses').delete()
    .eq('id', params.houseId).eq('collection_id', params.collectionId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
