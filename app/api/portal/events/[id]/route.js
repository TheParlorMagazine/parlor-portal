import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { eventSummary, eventError } from '../../../../../lib/eventAccess'
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  try { return Response.json(await eventSummary(serviceClient(), (await params).id, user.id)) }
  catch (error) { return eventError(error) }
}
