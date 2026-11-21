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
      const body = await request.json().catch(() => null)
      const name = typeof body?.name === 'string' ? body.name.trim() : ''
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (!name || name.length > 160 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: 'Enter your name and a valid email address.' }, { status: 400 })
      }
      registration = await db.rpc('register_film_club_rsvp', { ...args, p_name: name, p_email: email })
    }
  }
  const { data, error } = registration || await db.rpc('event_registration', { ...args, p_action: action })
  if (error) return eventError(error)
  try { await deliverEventMessages(db, id) } catch { console.error('Event messages pending retry') }
  return Response.json(data)
}
export const POST = (request, { params }) => change(request, params, 'join')
export const DELETE = (request, { params }) => change(request, params, 'cancel')
