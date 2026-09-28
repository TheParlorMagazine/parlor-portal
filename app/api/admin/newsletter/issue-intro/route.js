import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

// PATCH { issueId, intro } → save the newsletter intro blurb for an issue.
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => ({}))
  if (!b.issueId) return Response.json({ error: 'issueId required' }, { status: 400 })
  const patch = {}
  if ('intro' in b) patch.newsletter_intro = (b.intro || '').trim() || null
  if ('image' in b) patch.newsletter_image = (b.image || '').trim() || null
  const { error } = await db.from('issues').update(patch).eq('id', b.issueId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
