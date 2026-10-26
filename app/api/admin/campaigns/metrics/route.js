import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 })
  const db = serviceClient(), member = await memberOf(db,user.id)
  if (!['admin','editor','social_admin'].includes(member.role)) return Response.json({ error: 'Forbidden.' }, { status: 403 })
  const ids = [...new Set((new URL(request.url).searchParams.get('ids') || '').split(',').filter(Boolean))]
  if (!ids.length || ids.length > 100 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return Response.json({ error: 'Choose 1–100 valid campaigns.' }, { status: 400 })
  const { data, error } = await db.rpc('campaign_tracking_stats',{ p_campaign_ids: ids })
  if (error) return Response.json({ error: 'Tracking is unavailable. Check the tracking migration and server configuration.' }, { status: 503 })
  return Response.json({ metrics: data || [], refreshedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } })
}
