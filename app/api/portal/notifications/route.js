import { requireUser, serviceClient } from '../../../../lib/apiAuth'

// GET   → the member's notifications (newest first) + unread count
// PATCH → { id } marks one read, { all: true } marks all read
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { data, error } = await db
    .from('notifications')
    .select('id, type, message, link_to, link_ref, read, created_at')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const unread = (data || []).filter(n => !n.read).length
  return Response.json({ notifications: data || [], unread })
}

export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  let body = {}
  try { body = await request.json() } catch {}
  const db = serviceClient()
  let q = db.from('notifications').update({ read: true }).eq('member_id', user.id)
  if (body.all) q = q.eq('read', false)
  else if (body.id) q = q.eq('id', body.id)
  else return Response.json({ error: 'id or all required' }, { status: 400 })
  const { error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
