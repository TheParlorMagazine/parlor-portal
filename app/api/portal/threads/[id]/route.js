import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { effectiveForumRole, threadForumId } from '../../../../../lib/forums'
import { notifyMember } from '../../../../../lib/notify'

const THREAD_SEL = 'id, forum_id, title, body, upvote_count, reply_count, created_at, member_id, members!forum_threads_member_id_fkey(full_name, avatar_url)'
const REPLY_SEL  = 'id, body, created_at, member_id, members!forum_replies_member_id_fkey(full_name, avatar_url)'

// GET → the thread (OP) + its replies (forum members only)
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params

  const { data: thread } = await db.from('forum_threads').select(THREAD_SEL).eq('id', id).eq('status', 'live').single()
  if (!thread) return Response.json({ error: 'Thread not found' }, { status: 404 })
  const role = await effectiveForumRole(db, thread.forum_id, user.id)
  if (!role) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })

  const { data: replies } = await db.from('forum_replies')
    .select(REPLY_SEL).eq('thread_id', id).eq('status', 'live').order('created_at', { ascending: true })
  const { data: voted } = await db.from('forum_thread_votes').select('thread_id').eq('thread_id', id).eq('member_id', user.id).maybeSingle()
  const { data: forum } = await db.from('forums').select('id, name').eq('id', thread.forum_id).single()

  return Response.json({
    forum,
    thread: {
      id: thread.id, forum_id: thread.forum_id, title: thread.title, body: thread.body,
      upvote_count: thread.upvote_count, reply_count: thread.reply_count, created_at: thread.created_at,
      author_name: thread.members?.full_name || 'Member', author_avatar: thread.members?.avatar_url || null,
      author_id: thread.member_id, upvoted: !!voted, my_role: role,
    },
    replies: (replies || []).map(r => ({
      id: r.id, body: r.body, created_at: r.created_at, member_id: r.member_id,
      author_name: r.members?.full_name || 'Member', author_avatar: r.members?.avatar_url || null,
    })),
  })
}

// POST { body } → reply to the thread
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params

  const t = await threadForumId(db, id)
  if (!t || t.status !== 'live') return Response.json({ error: 'Thread not found' }, { status: 404 })
  const role = await effectiveForumRole(db, t.forum_id, user.id)
  if (!role) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })

  let b = {}
  try { b = await request.json() } catch {}
  const body = (b.body || '').trim()
  if (!body) return Response.json({ error: 'Reply required' }, { status: 400 })

  const { data: reply, error } = await db.from('forum_replies')
    .insert({ thread_id: id, member_id: user.id, body }).select(REPLY_SEL).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const now = new Date().toISOString()
  const { count } = await db.from('forum_replies').select('id', { count: 'exact', head: true }).eq('thread_id', id).eq('status', 'live')
  await db.from('forum_threads').update({ reply_count: count || 1, last_activity_at: now }).eq('id', id)

  // Notify the thread's author of a reply (not yourself).
  const { data: thread } = await db.from('forum_threads').select('member_id, title').eq('id', id).single()
  if (thread && thread.member_id !== user.id) {
    const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
    await notifyMember(db, { memberId: thread.member_id, type: 'reply', message: `${me?.full_name || 'A member'} replied to “${thread.title}”`, linkTo: 'forum', linkRef: `${t.forum_id}/${id}` })
  }
  return Response.json({ reply: {
    id: reply.id, body: reply.body, created_at: reply.created_at, member_id: reply.member_id,
    author_name: reply.members?.full_name || 'Member', author_avatar: reply.members?.avatar_url || null,
  } })
}
