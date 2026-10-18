import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

// POST { comment_id } → { liked: bool, like_count: number }
// Toggles the current member's like on an article comment.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me) return Response.json({ error: 'Not a member' }, { status: 403 })

  let body = {}
  try { body = await request.json() } catch {}
  const { comment_id } = body
  if (!comment_id) return Response.json({ error: 'comment_id required' }, { status: 400 })

  // Check if like already exists
  const { data: existing } = await db
    .from('article_comment_likes')
    .select('id')
    .eq('comment_id', comment_id)
    .eq('member_id', me.id)
    .maybeSingle()

  if (existing) {
    await db.from('article_comment_likes').delete().eq('id', existing.id)
  } else {
    await db.from('article_comment_likes').insert({ comment_id, member_id: me.id })
  }

  const { count } = await db
    .from('article_comment_likes')
    .select('id', { count: 'exact', head: true })
    .eq('comment_id', comment_id)

  return Response.json({ liked: !existing, like_count: count || 0 })
}
