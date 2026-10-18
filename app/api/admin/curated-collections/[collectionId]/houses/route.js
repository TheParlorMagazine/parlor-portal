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

// POST — add a house to a collection
export async function POST(request, { params: rawParams }) {
  const { err, db } = await auth(request)
  if (err) return err
  const params = await rawParams
  const body = await request.json().catch(() => ({}))
  const { data, error } = await db.from('tot_houses').insert({
    collection_id: params.collectionId,
    name: (body.name || '').trim(),
    description: (body.description || '').trim() || null,
    sort_order: body.sort_order ?? 0,
    active: body.active ?? true,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ house: { ...data, treats: [] } })
}
