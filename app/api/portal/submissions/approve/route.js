import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { notifyAdmins } from '../../../../../lib/notify'

// POST { id } → the author approves the final, edited version of their member
// post, unlocking publication. Sets articles.author_approved_at on the linked
// article. Only the author can approve, and only their own submission.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const b = await request.json().catch(() => ({}))
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })

  const db = serviceClient()
  const { data: sub } = await db.from('member_submissions')
    .select('id, title, member_id, published_article_id').eq('id', b.id).eq('member_id', user.id).single()
  if (!sub) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!sub.published_article_id) return Response.json({ error: 'No linked article to approve yet.' }, { status: 400 })

  const now = new Date().toISOString()
  const { error } = await db.from('articles').update({ author_approved_at: now }).eq('id', sub.published_article_id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
  await notifyAdmins(db, { type: 'system', message: `${me?.full_name || 'The author'} approved the final version of “${sub.title}”`, linkTo: 'admin', linkRef: 'community-posts' })
  return Response.json({ ok: true, author_approved_at: now })
}
