import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { hasPaidAccess } from '../../../../../lib/plans'
import { notifyMember } from '../../../../../lib/notify'

const PROMPT_SEL = 'id, book_id, title, body, upvote_count, reply_count, created_at, member_id, members!book_prompts_member_id_fkey(full_name, avatar_url)'
const REPLY_SEL  = 'id, body, created_at, member_id, members!book_prompt_replies_member_id_fkey(full_name, avatar_url)'

async function paidGate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Not signed in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!hasPaidAccess(me)) return { error: Response.json({ error: 'The Archive is for paid members.' }, { status: 403 }) }
  return { db, user, me }
}

// GET → prompt + replies (paid members)
export async function GET(request, { params }) {
  const g = await paidGate(request); if (g.error) return g.error
  const { db, user } = g
  const { id } = await params

  const { data: prompt } = await db.from('book_prompts').select(PROMPT_SEL).eq('id', id).eq('status', 'live').single()
  if (!prompt) return Response.json({ error: 'Not found' }, { status: 404 })
  const { data: book } = await db.from('book_club').select('id, title, author').eq('id', prompt.book_id).single()
  const { data: replies } = await db.from('book_prompt_replies').select(REPLY_SEL).eq('prompt_id', id).eq('status', 'live').order('created_at', { ascending: true })
  const { data: voted } = await db.from('book_prompt_votes').select('prompt_id').eq('prompt_id', id).eq('member_id', user.id).maybeSingle()

  return Response.json({
    book,
    prompt: {
      id: prompt.id, book_id: prompt.book_id, title: prompt.title, body: prompt.body,
      upvote_count: prompt.upvote_count, reply_count: prompt.reply_count, created_at: prompt.created_at,
      author_name: prompt.members?.full_name || 'The Parlor', author_avatar: prompt.members?.avatar_url || null,
      upvoted: !!voted,
    },
    replies: (replies || []).map(r => ({
      id: r.id, body: r.body, created_at: r.created_at, member_id: r.member_id,
      author_name: r.members?.full_name || 'Member', author_avatar: r.members?.avatar_url || null,
    })),
  })
}

// POST { body } → reply to a prompt (paid members)
export async function POST(request, { params }) {
  const g = await paidGate(request); if (g.error) return g.error
  const { db, user, me } = g
  const { id } = await params

  const { data: prompt } = await db.from('book_prompts').select('id, book_id, member_id, title, status').eq('id', id).single()
  if (!prompt || prompt.status !== 'live') return Response.json({ error: 'Not found' }, { status: 404 })

  let b = {}
  try { b = await request.json() } catch {}
  const body = (b.body || '').trim()
  if (!body) return Response.json({ error: 'Reply required' }, { status: 400 })

  const { data: reply, error } = await db.from('book_prompt_replies').insert({ prompt_id: id, member_id: user.id, body }).select(REPLY_SEL).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const now = new Date().toISOString()
  const { count } = await db.from('book_prompt_replies').select('id', { count: 'exact', head: true }).eq('prompt_id', id).eq('status', 'live')
  await db.from('book_prompts').update({ reply_count: count || 1, last_activity_at: now }).eq('id', id)

  if (prompt.member_id !== user.id) {
    await notifyMember(db, { memberId: prompt.member_id, type: 'reply', message: `${me.full_name || 'A member'} responded to “${prompt.title}”`, linkTo: 'bookclub', linkRef: `${prompt.book_id}/${id}` })
  }
  return Response.json({ reply: {
    id: reply.id, body: reply.body, created_at: reply.created_at, member_id: reply.member_id,
    author_name: reply.members?.full_name || 'Member', author_avatar: reply.members?.avatar_url || null,
  } })
}
