import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await db.from('newsletter_settings').select('sections').eq('id', 1).maybeSingle()
  return Response.json({ sections: data?.sections || {} })
}

export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { sections } = await request.json().catch(() => ({}))
  if (!sections) return Response.json({ error: 'sections required' }, { status: 400 })
  const { error } = await db.from('newsletter_settings').upsert({ id: 1, sections })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
