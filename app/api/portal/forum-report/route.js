import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { effectiveForumRole, threadForumId } from '../../../../lib/forums'
import { hasPaidAccess } from '../../../../lib/plans'
import { notifyAdmins } from '../../../../lib/notify'

// POST { kind, id, reason? } → flag community content for moderator review.
//   forum_thread | forum_reply → forum members only
//   book_prompt  | book_reply  → paid members only (the Reading Room)
// Bumps report_count and pings moderators on the first report.
const TABLE = { forum_thread: 'forum_threads', forum_reply: 'forum_replies', book_prompt: 'book_prompts', book_reply: 'book_prompt_replies' }

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in to report' }, { status: 401 })
  const db = serviceClient()
  let b = {}
  try { b = await request.json() } catch {}
  const table = TABLE[b.kind]
  if (!table || !b.id) return Response.json({ error: 'kind and id required' }, { status: 400 })

  // Access check by content family.
  if (b.kind === 'forum_thread' || b.kind === 'forum_reply') {
    let forumId
    if (b.kind === 'forum_thread') { const t = await threadForumId(db, b.id); if (!t) return Response.json({ error: 'Not found' }, { status: 404 }); forumId = t.forum_id }
    else { const { data: r } = await db.from('forum_replies').select('thread_id').eq('id', b.id).single(); if (!r) return Response.json({ error: 'Not found' }, { status: 404 }); const t = await threadForumId(db, r.thread_id); forumId = t?.forum_id }
    const role = await effectiveForumRole(db, forumId, user.id)
    if (!role) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })
  } else {
    const me = await memberOf(db, user.id)
    if (!hasPaidAccess(me)) return Response.json({ error: 'Paid members only' }, { status: 403 })
  }

  const { data: row } = await db.from(table).select('report_count').eq('id', b.id).single()
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  const next = (row.report_count || 0) + 1
  await db.from(table).update({ report_count: next }).eq('id', b.id)
  if (next === 1) await notifyAdmins(db, { type: 'system', message: `A ${b.kind.replace('_', ' ')} was reported`, linkTo: 'admin', linkRef: 'portal' })
  return Response.json({ ok: true })
}
