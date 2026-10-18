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

// DELETE — remove a standalone product from a collection
export async function DELETE(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const { error } = await db
    .from('tot_collection_products')
    .delete()
    .eq('id', params.itemId)
    .eq('collection_id', params.collectionId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
