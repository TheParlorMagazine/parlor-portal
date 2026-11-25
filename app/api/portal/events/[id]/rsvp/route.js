import { requireUser, serviceClient } from '../../../../../../lib/apiAuth'
import { eventError } from '../../../../../../lib/eventAccess'
import { deliverEventMessages } from '../../../../../../lib/eventMessages'
async function change(request, params, action) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const args = { p_event: id, p_actor: user.id }
  let registration
  if (action === 'join') {
    const { data: screening, error } = await db.from('film_club_screenings').select('event_id').eq('event_id', id).maybeSingle()
    if (error && !['42P01', 'PGRST205'].includes(error.code)) return eventError(error)
    if (screening) {
      return Response.json({ error: 'Purchase screening tickets through Film Club.', path: '/portal/film-club' }, { status: 409 })
    }
  }
  const { data, error } = registration || await db.rpc('event_registration', { ...args, p_action: action })
  if (error) return eventError(error)
  try { await deliverEventMessages(db, id) } catch { console.error('Event messages pending retry') }
  return Response.json(data)
}
export const POST = (request, { params }) => change(request, params, 'join')
export const DELETE = (request, { params }) => change(request, params, 'cancel')
