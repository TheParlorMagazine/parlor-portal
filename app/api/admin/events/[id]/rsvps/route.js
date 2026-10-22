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

  const { data, error } = await db.from('event_attendance')
    .select('member_id,status,created_at,queue_position').eq('event_id', id).neq('status', 'cancelled').order('created_at')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const ids = (data || []).map(r => r.member_id)
  const { data: members } = ids.length ? await db.from('members').select('id,full_name,email').in('id', ids) : { data: [] }
  const byId = Object.fromEntries((members || []).map(m => [m.id,m]))
  return Response.json({ attendees: (data || []).map(r => ({ member_id: r.member_id,
    full_name: byId[r.member_id]?.full_name || 'Member', email: byId[r.member_id]?.email || '',
    status: r.status, queue_position: r.status === 'waitlist' ? r.queue_position : null, rsvp_at: r.created_at })) })
}
