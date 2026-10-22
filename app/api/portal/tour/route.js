import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { TOUR_VERSION, validTourState } from '../../../../lib/portalTour'
const FIELDS = 'version,status,step,updated_at,completed_at'
const unavailable = () => Response.json({ error: 'Tour progress is temporarily unavailable. You can still explore the portal.' }, { status: 503 })
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { data: config, error: configError } = await db.from('portal_tour_config').select('launched_at').eq('id', true).single()
  if (configError || !config) return unavailable()
  const { data: state, error } = await db.from('member_portal_tour_state').select(FIELDS).eq('member_id', user.id).maybeSingle()
  if (error) return unavailable()
  return Response.json({ state: state || { version: TOUR_VERSION, status: 'not_started', step: 0 }, eligible: Date.parse(user.created_at) >= Date.parse(config.launched_at) }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!validTourState(body)) return Response.json({ error: 'Invalid tour progress' }, { status: 400 })
  const now = new Date().toISOString()
  // Never accept member_id, membership fields, or timestamps supplied by the caller.
  const { data, error } = await serviceClient().from('member_portal_tour_state').upsert({ member_id: user.id, version: TOUR_VERSION, status: body.status, step: body.step, updated_at: now, completed_at: body.status === 'completed' ? now : null }, { onConflict: 'member_id' }).select(FIELDS).single()
  if (error) return unavailable()
  return Response.json({ state: data }, { headers: { 'Cache-Control': 'no-store' } })
}
