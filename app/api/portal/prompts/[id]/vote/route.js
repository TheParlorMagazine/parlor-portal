import { requireUser, serviceClient, memberOf } from '../../../../../../lib/apiAuth'
import { hasPaidAccess } from '../../../../../../lib/plans'

// POST → toggle this member's upvote on a discussion prompt. Paid members only.
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!hasPaidAccess(me)) return Response.json({ error: 'Paid members only' }, { status: 403 })
  const { id } = await params

  const { data: prompt } = await db.from('book_prompts').select('id').eq('id', id).maybeSingle()
  if (!prompt) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data: existing } = await db.from('book_prompt_votes').select('prompt_id').eq('prompt_id', id).eq('member_id', user.id).maybeSingle()
  let upvoted
  if (existing) { await db.from('book_prompt_votes').delete().eq('prompt_id', id).eq('member_id', user.id); upvoted = false }
  else { await db.from('book_prompt_votes').insert({ prompt_id: id, member_id: user.id }); upvoted = true }
  const { count } = await db.from('book_prompt_votes').select('prompt_id', { count: 'exact', head: true }).eq('prompt_id', id)
  await db.from('book_prompts').update({ upvote_count: count || 0 }).eq('id', id)
  return Response.json({ upvoted, upvote_count: count || 0 })
}
