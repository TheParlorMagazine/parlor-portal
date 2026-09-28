import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { hasPaidAccess } from '../../../../../lib/plans'
import { excerpt } from '../../../../../lib/forums'

// GET → a book + its editor discussion prompts. Book meta is visible to all
// members; prompts are returned only to paid members (free members see a teaser).
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  const paid = hasPaidAccess(me)
  const { id } = await params

  const { data: book } = await db.from('book_club')
    .select('id, title, author, cover_image_url, book_url, blurb, status, meeting_at').eq('id', id).single()
  if (!book) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!paid) return Response.json({ book, paid: false, prompts: [] })

  const { data: prompts } = await db.from('book_prompts')
    .select('id, title, body, reply_count, upvote_count, pinned, last_activity_at, created_at, member_id, members!book_prompts_member_id_fkey(full_name, avatar_url)')
    .eq('book_id', id).eq('status', 'live')
    .order('pinned', { ascending: false }).order('last_activity_at', { ascending: false })

  const ids = (prompts || []).map(p => p.id)
  let voted = new Set()
  if (ids.length) {
    const { data: v } = await db.from('book_prompt_votes').select('prompt_id').eq('member_id', user.id).in('prompt_id', ids)
    voted = new Set((v || []).map(x => x.prompt_id))
  }
  const shaped = (prompts || []).map(p => ({
    id: p.id, title: p.title, excerpt: excerpt(p.body), reply_count: p.reply_count, upvote_count: p.upvote_count,
    pinned: p.pinned, last_activity_at: p.last_activity_at, created_at: p.created_at,
    author_name: p.members?.full_name || 'The Parlor', author_avatar: p.members?.avatar_url || null,
    upvoted: voted.has(p.id),
  }))
  return Response.json({ book, paid: true, prompts: shaped })
}
