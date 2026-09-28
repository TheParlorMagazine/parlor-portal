import { requireUser, serviceClient } from '../../../../lib/apiAuth'

// Lightweight unread counts for the sidebar badges (notifications + inbox).
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()

  const [notif, threads] = await Promise.all([
    db.from('notifications').select('id', { count: 'exact', head: true }).eq('member_id', user.id).eq('read', false),
    db.from('inbox_threads').select('member_unread').eq('member_id', user.id),
  ])

  const notifications = notif.count || 0
  const inbox = (threads.data || []).reduce((s, t) => s + (t.member_unread || 0), 0)
  return Response.json({ notifications, inbox })
}
