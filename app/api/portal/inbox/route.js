import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { notifyAdmins } from '../../../../lib/notify'

// GET  → threads. Admins see ALL member conversations; members see their own.
// POST → { subject, body } starts a new thread to the editors
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  const isAdmin = me.role === 'admin'

  let q = db.from('inbox_threads')
    .select('id, subject, last_message_preview, last_message_at, member_unread, initiated_by, created_at, members(full_name)')
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (!isAdmin) q = q.eq('member_id', user.id)

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const threads = (data || []).map(t => ({ ...t, member_name: t.members?.full_name || null, members: undefined }))
  return Response.json({ threads, isAdmin })
}

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  let body = {}
  try { body = await request.json() } catch {}
  const subject = (body.subject || '').trim()
  const text = (body.body || '').trim()
  if (!text) return Response.json({ error: 'Message required' }, { status: 400 })

  const db = serviceClient()
  const { data: member } = await db.from('members').select('full_name, avatar_url').eq('id', user.id).single()
  const now = new Date().toISOString()

  const { data: thread, error: tErr } = await db.from('inbox_threads').insert({
    member_id: user.id,
    subject: subject || 'New message',
    last_message_preview: text.slice(0, 140),
    last_message_at: now,
    member_unread: 0,
    initiated_by: 'member',
  }).select().single()
  if (tErr) return Response.json({ error: tErr.message }, { status: 500 })

  const { error: mErr } = await db.from('inbox_messages').insert({
    thread_id: thread.id,
    sender_type: 'member',
    sender_name: member?.full_name || 'You',
    sender_id: user.id,
    body: text,
    read: true,
  })
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 })

  // Let the editors know a member reached out.
  await notifyAdmins(db, {
    message: `${member?.full_name || 'A member'} sent a message: “${(subject || text).slice(0, 60)}”`,
    linkTo: 'inbox', exceptId: user.id,
  })

  return Response.json({ thread })
}
