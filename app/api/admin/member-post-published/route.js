import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { notifyMember } from '../../../../lib/notify'

const ROLES = ['admin', 'editor']

// POST { article_id } → called right after a member-post article is published.
// Reveals the linked community post (feed + author profile) so the edited,
// editorial version appears as BOTH a member article and a community post.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => ({}))
  if (!b.article_id) return Response.json({ error: 'article_id required' }, { status: 400 })

  const { data: article } = await db.from('articles')
    .select('id, slug, title, published, media_type, source_member_post_id').eq('id', b.article_id).single()
  if (!article || article.media_type !== 'member_post' || !article.source_member_post_id) {
    return Response.json({ ok: true, skipped: true })
  }
  if (!article.published) return Response.json({ ok: true, skipped: 'not_published' })

  const { data: sub } = await db.from('member_submissions').select('id, member_id, feed_visible, status').eq('id', article.source_member_post_id).single()
  if (!sub) return Response.json({ ok: true, skipped: 'no_sub' })

  await db.from('member_submissions').update({ status: 'published', feed_visible: true }).eq('id', sub.id)
  if (!sub.feed_visible) {
    await notifyMember(db, { memberId: sub.member_id, type: 'system', message: `Your piece “${article.title}” is now live`, linkTo: 'article', linkRef: article.slug })
  }
  return Response.json({ ok: true })
}
