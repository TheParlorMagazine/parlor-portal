import { requireUser, serviceClient } from '../../../../../../lib/apiAuth'
import { effectiveForumRole, threadForumId } from '../../../../../../lib/forums'

// POST → toggle this member's upvote on the thread. Returns { upvoted, upvote_count }.
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params

  const t = await threadForumId(db, id)
  if (!t) return Response.json({ error: 'Thread not found' }, { status: 404 })
  const role = await effectiveForumRole(db, t.forum_id, user.id)
  if (!role) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })

  const { data: existing } = await db.from('forum_thread_votes').select('thread_id').eq('thread_id', id).eq('member_id', user.id).maybeSingle()
  let upvoted
  if (existing) {
    await db.from('forum_thread_votes').delete().eq('thread_id', id).eq('member_id', user.id)
    upvoted = false
  } else {
    await db.from('forum_thread_votes').insert({ thread_id: id, member_id: user.id })
    upvoted = true
  }
  const { count } = await db.from('forum_thread_votes').select('thread_id', { count: 'exact', head: true }).eq('thread_id', id)
  await db.from('forum_threads').update({ upvote_count: count || 0 }).eq('id', id)
  return Response.json({ upvoted, upvote_count: count || 0 })
}
