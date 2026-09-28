import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const TEAM_ROLES = ['admin', 'editor', 'writer', 'finance_admin', 'social_admin']

// GET ?q= → up to 15 active members matching name or email. Admin/team only.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!TEAM_ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  if (!q) return Response.json({ members: [] })
  const { data, error } = await db.from('members')
    .select('id, full_name, email, plan').eq('deactivated', false)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .order('full_name').limit(15)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ members: data || [] })
}
