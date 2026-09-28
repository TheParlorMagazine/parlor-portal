import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { effectiveForumRole, excerpt } from '../../../../../lib/forums'
import { notifyMember } from '../../../../../lib/notify'

// GET → forum meta + its threads (members only)
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params

  const role = await effectiveForumRole(db, id, user.id)
  if (!role) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })

  const { data: forum } = await db.from('forums').select('id, name, description, guidelines, status').eq('id', id).single()
  if (!forum || forum.status !== 'active') return Response.json({ error: 'Forum not found' }, { status: 404 })

  const { data: threads } = await db
    .from('forum_threads')
    .select('id, title, body, reply_count, upvote_count, pinned, last_activity_at, created_at, member_id, members!forum_threads_member_id_fkey(full_name, avatar_url)')
    .eq('forum_id', id).eq('status', 'live')
    .order('pinned', { ascending: false }).order('last_activity_at', { ascending: false })
    .limit(100)

  // Which of these threads has this member upvoted?
  const ids = (threads || []).map(t => t.id)
  let voted = new Set()
  if (ids.length) {
    const { data: votes } = await db.from('forum_thread_votes').select('thread_id').eq('member_id', user.id).in('thread_id', ids)
    voted = new Set((votes || []).map(v => v.thread_id))
  }

  const shaped = (threads || []).map(t => ({
    id: t.id, title: t.title, excerpt: excerpt(t.body),
    reply_count: t.reply_count, upvote_count: t.upvote_count, pinned: t.pinned,
    last_activity_at: t.last_activity_at, created_at: t.created_at,
    author_name: t.members?.full_name || 'Member', author_avatar: t.members?.avatar_url || null,
    upvoted: voted.has(t.id),
  }))
  return Response.json({ forum: { ...forum, my_role: role }, threads: shaped })
}

// POST { title, body } → start a thread (any forum member)
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const role = await effectiveForumRole(db, id, user.id)
  if (!role) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })

  let b = {}
  try { b = await request.json() } catch {}
  const title = (b.title || '').trim()
  if (!title) return Response.json({ error: 'Title required' }, { status: 400 })

  const now = new Date().toISOString()
  const { data: thread, error } = await db.from('forum_threads')
    .insert({ forum_id: id, member_id: user.id, title, body: (b.body || '').trim() || null, last_activity_at: now })
    .select('id').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Bump forum thread count.
  const { count } = await db.from('forum_threads').select('id', { count: 'exact', head: true }).eq('forum_id', id).eq('status', 'live')
  await db.from('forums').update({ thread_count: count || 1 }).eq('id', id)

  // Notify other forum members of the new thread.
  const { data: fm } = await db.from('forum_members').select('member_id').eq('forum_id', id)
  const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
  const { data: forum } = await db.from('forums').select('name').eq('id', id).single()
  for (const m of fm || []) {
    if (m.member_id === user.id) continue
    await notifyMember(db, { memberId: m.member_id, type: 'new_thread', message: `${me?.full_name || 'A member'} started “${title}” in ${forum?.name || 'a forum'}`, linkTo: 'forum', linkRef: `${id}/${thread.id}` })
  }
  return Response.json({ thread_id: thread.id })
}
