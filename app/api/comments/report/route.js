import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { notifyAdmins } from '../../../../lib/notify'

// POST { comment_id, reason? } → flag a comment for moderator review.
// One report per member per comment (dupes are silently ignored). Reported
// comments surface in Admin → Portal Management → Reported.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in to report' }, { status: 401 })
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.comment_id) return Response.json({ error: 'comment_id required' }, { status: 400 })
  const db = serviceClient()

  const { data: comment } = await db
    .from('article_comments').select('id, status, article_id').eq('id', b.comment_id).single()
  if (!comment || comment.status !== 'live') return Response.json({ error: 'Not found' }, { status: 404 })

  const { error: insErr } = await db
    .from('comment_reports')
    .insert({ comment_id: b.comment_id, member_id: user.id, reason: (b.reason || '').slice(0, 500) || null })
  // Unique violation = already reported by this member; treat as success, no re-count.
  if (insErr) {
    if (insErr.code === '23505') return Response.json({ ok: true, already: true })
    return Response.json({ error: insErr.message }, { status: 500 })
  }

  // Recompute the count from the reports table (authoritative).
  const { count } = await db
    .from('comment_reports').select('id', { count: 'exact', head: true }).eq('comment_id', b.comment_id)
  await db.from('article_comments').update({ report_count: count || 1 }).eq('id', b.comment_id)

  // First report on a comment pings moderators.
  if ((count || 1) === 1) {
    const { data: art } = await db.from('articles').select('title, slug').eq('id', comment.article_id).single()
    await notifyAdmins(db, {
      type: 'system',
      message: `A comment on “${art?.title || 'an article'}” was reported`,
      linkTo: 'admin', linkRef: 'portal',
    })
  }
  return Response.json({ ok: true })
}
