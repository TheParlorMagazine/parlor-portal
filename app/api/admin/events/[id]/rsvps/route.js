import { requireUser, serviceClient, memberOf } from '../../../../../../lib/apiAuth'

const EVENT_ROLES = ['admin', 'editor', 'social_admin']

// GET → the attendee list for an event (name, email, status). Admin/team only.
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!EVENT_ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { data, error } = await db.from('event_rsvps')
    .select('status, created_at, members(full_name, email)')
    .eq('event_id', id).neq('status', 'cancelled')
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const attendees = (data || []).map(r => ({
    full_name: r.members?.full_name || '—', email: r.members?.email || '', status: r.status, rsvp_at: r.created_at,
  }))
  return Response.json({ attendees })
}
