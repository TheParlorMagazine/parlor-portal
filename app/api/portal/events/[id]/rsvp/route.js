import { requireUser, serviceClient } from '../../../../../../lib/apiAuth'
import { eventError } from '../../../../../../lib/eventAccess'
import { deliverEventMessages } from '../../../../../../lib/eventMessages'
async function change(request, params, action) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const { data, error } = await db.rpc('event_registration', { p_event: id, p_actor: user.id, p_action: action })
  if (error) return eventError(error)
  try { await deliverEventMessages(db, id) } catch { console.error('Event messages pending retry') }
  return Response.json(data)
}
export const POST = (request, { params }) => change(request, params, 'join')
export const DELETE = (request, { params }) => change(request, params, 'cancel')
