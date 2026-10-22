import { requireUser, serviceClient } from '../../../../../../lib/apiAuth'
import { eventError } from '../../../../../../lib/eventAccess'
import { deliverEventMessages } from '../../../../../../lib/eventMessages'
async function gate(request, params) {
  const user = await requireUser(request)
  if (!user) return { response: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const { id } = await params
  const { data: allowed, error } = await db.rpc('event_staff', { p_event: id, p_member: user.id })
  if (error) return { response: eventError(error) }
  if (!allowed) return { response: Response.json({ error: 'Hosts only' }, { status: 403 }) }
  return { db, user, id }
}
export async function GET(request, { params }) {
  const g = await gate(request, params)
  if (g.response) return g.response
  const { data, error } = await g.db.from('event_attendance').select('member_id,status,queued_at,queue_position,created_at').eq('event_id', g.id).neq('status', 'cancelled').order('created_at')
  if (error) return eventError(error)
  const ids = (data || []).map(r => r.member_id)
  const { data: members, error: memberError } = ids.length ? await g.db.from('members').select('id,full_name').in('id', ids) : { data: [] }
  if (memberError) return eventError(memberError)
  const names = Object.fromEntries((members || []).map(m => [m.id, m.full_name]))
  return Response.json({ attendees: (data || []).map(r => ({ ...r, full_name: names[r.member_id] || 'Member', queue_position: r.status === 'waitlist' ? r.queue_position : null })) })
}
export async function PATCH(request, { params }) {
  const g = await gate(request, params)
  if (g.response) return g.response
  const body = await request.json().catch(() => ({}))
  if (!body.member_id || !['promote','remove'].includes(body.action)) return Response.json({ error: 'Member and action required' }, { status: 400 })
  const { data, error } = await g.db.rpc('event_registration', { p_event: g.id, p_actor: g.user.id, p_target: body.member_id, p_action: body.action })
  if (error) return eventError(error)
  try { await deliverEventMessages(g.db, g.id) } catch { console.error('Event messages pending retry') }
  return Response.json(data)
}
