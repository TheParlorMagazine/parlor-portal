import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { notifyMember } from '../../../../lib/notify'

const ROLES = ['admin', 'editor']

// POST { article_id } → ask the member author to review & approve the final,
// edited version of their member-post article before it can publish.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => ({}))
  if (!b.article_id) return Response.json({ error: 'article_id required' }, { status: 400 })

  const { data: article } = await db.from('articles')
    .select('id, title, source_member_post_id, community_author_id, media_type').eq('id', b.article_id).single()
  if (!article) return Response.json({ error: 'Article not found' }, { status: 404 })
  if (article.media_type !== 'member_post') return Response.json({ error: 'Not a member post' }, { status: 400 })

  // Prefer the linked submission's author; fall back to community_author_id.
  let memberId = article.community_author_id || null
  let submissionId = article.source_member_post_id || null
  if (submissionId) {
    const { data: sub } = await db.from('member_submissions').select('member_id').eq('id', submissionId).single()
    if (sub?.member_id) memberId = sub.member_id
  }
  if (!memberId) return Response.json({ error: 'No author to notify' }, { status: 400 })

  await notifyMember(db, {
    memberId, type: 'system',
    message: `Please review & approve the final version of “${article.title}” before it publishes`,
    linkTo: 'write', linkRef: submissionId,
  })
  return Response.json({ ok: true })
}
