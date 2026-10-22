import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const TEAM_ROLES = ['admin', 'editor', 'writer', 'finance_admin', 'social_admin']

async function authorize(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Please sign in.' }, { status: 401 }) }

  const db = serviceClient()
  const member = await memberOf(db, user.id)

  if (member.role !== 'admin') {
    return { error: Response.json({ error: 'Master Admin access required.' }, { status: 403 }) }
  }

  return { db, user }
}

// Search subscribers by name or email
export async function GET(request) {
  const auth = await authorize(request)
  if (auth.error) return auth.error

  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  if (!q) return Response.json({ members: [] })
  if (q.length > 150) return Response.json({ error: 'Search is too long.' }, { status: 400 })

  const escaped = q.replace(/[%_,().]/g, ' ').trim()
  if (!escaped) return Response.json({ members: [] })

  const { data, error } = await auth.db
    .from('members')
    .select('id, full_name, email, role, joined_at')
    .or(`email.ilike.%${escaped}%,full_name.ilike.%${escaped}%`)
    .limit(15)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({
    members: (data || []).filter(m => !TEAM_ROLES.includes(m.role))
  })
}

// Assign or remove a team role
export async function PATCH(request) {
  const auth = await authorize(request)
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { id, role } = body
  if (typeof id !== 'string' || !id.trim()) {
    return Response.json({ error: 'Member ID is required.' }, { status: 400 })
  }

  if (role !== null && !TEAM_ROLES.includes(role)) {
    return Response.json({ error: 'Invalid role.' }, { status: 400 })
  }

  if (id === auth.user.id && role !== 'admin') {
    return Response.json({ error: 'You cannot remove your own Master Admin access.' }, { status: 403 })
  }

  const { data, error } = await auth.db
    .from('members')
    .update({ role })
    .eq('id', id)
    .select('id, role')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ member: data })
}
