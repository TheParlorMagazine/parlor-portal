import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { notifyMember } from '../../../../../lib/notify'

// A member can only touch their own thread; an admin can touch any thread.
async function getThread(db, user, id, isAdmin) {
  let q = db.from('inbox_threads').select('*').eq('id', id)
  if (!isAdmin) q = q.eq('member_id', user.id)
  const { data } = await q.maybeSingle()
  return data
}

// GET → messages in the thread (+ marks it read from the member's side)
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await params
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  const isAdmin = me.role === 'admin'
  const thread = await getThread(db, user, id, isAdmin)
  if (!thread) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data: messages, error } = await db
    .from('inbox_messages')
    .select('id, sender_type, sender_name, sender_id, body, read, created_at')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Clear the member's unread only when the thread's OWN member is viewing.
  if (thread.member_id === user.id && thread.member_unread > 0) {
    await db.from('inbox_messages').update({ read: true }).eq('thread_id', id).neq('sender_type', 'member').eq('read', false)
    await db.from('inbox_threads').update({ member_unread: 0 }).eq('id', id)
  }

  return Response.json({ thread, messages: messages || [], isAdmin })
}

// POST → { body } adds a reply. Admins reply as themselves (sender_type 'admin')
// to any thread and notify the member; members reply to their own thread.
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await params
  let body = {}
  try { body = await request.json() } catch {}
  const text = (body.body || '').trim()
  if (!text) return Response.json({ error: 'Message required' }, { status: 400 })

  const db = serviceClient()
  const me = await memberOf(db, user.id)
  const isAdmin = me.role === 'admin'
  const thread = await getThread(db, user, id, isAdmin)
  if (!thread) return Response.json({ error: 'Not found' }, { status: 404 })

  const adminReply = isAdmin && thread.member_id !== user.id
  const { data: message, error } = await db.from('inbox_messages').insert({
    thread_id: id,
    sender_type: adminReply ? 'admin' : 'member',
    sender_name: me.full_name || (adminReply ? 'The Parlor' : 'You'),
    sender_id: user.id,
    body: text,
    read: !adminReply, // member hasn't read an admin reply yet
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const upd = { last_message_preview: text.slice(0, 140), last_message_at: new Date().toISOString() }
  if (adminReply) upd.member_unread = (thread.member_unread || 0) + 1
  await db.from('inbox_threads').update(upd).eq('id', id)

  // Notify the member that an admin replied.
  if (adminReply) {
    await notifyMember(db, {
      memberId: thread.member_id, type: 'inbox',
      message: `${me.full_name || 'The Parlor'} replied to your message`,
      linkTo: 'inbox',
    })
  }

  return Response.json({ message })
}
