import { requireUser, serviceClient } from '../../../../lib/apiAuth'

// GET → the active forums this member belongs to (their private rooms).
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { data, error } = await db
    .from('forum_members')
    .select('role, forums(id, name, description, thread_count, member_count, status, created_at)')
    .eq('member_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const forums = (data || [])
    .filter(r => r.forums && r.forums.status === 'active')
    .map(r => ({ ...r.forums, my_role: r.role }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return Response.json({ forums })
}
