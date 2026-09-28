import { requireUser, serviceClient, memberOf } from '../../../../../../lib/apiAuth'

const BOOK_ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!BOOK_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

// GET → prompts for a book (admin view). POST → create a discussion prompt.
export async function GET(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  const { id } = await params
  const { data } = await g.db.from('book_prompts')
    .select('id, title, body, reply_count, upvote_count, pinned, created_at, status')
    .eq('book_id', id).eq('status', 'live').order('created_at', { ascending: false })
  return Response.json({ prompts: data || [] })
}

export async function POST(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  const { id } = await params
  let b = {}; try { b = await request.json() } catch {}
  const title = (b.title || '').trim()
  if (!title) return Response.json({ error: 'Prompt title required' }, { status: 400 })
  const { data: book } = await g.db.from('book_club').select('id').eq('id', id).single()
  if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })
  const { data, error } = await g.db.from('book_prompts')
    .insert({ book_id: id, member_id: g.user.id, title, body: (b.body || '').trim() || null, pinned: !!b.pinned })
    .select('id').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ prompt_id: data.id })
}

// DELETE { prompt_id } → remove a prompt
export async function DELETE(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.prompt_id) return Response.json({ error: 'prompt_id required' }, { status: 400 })
  const { error } = await g.db.from('book_prompts').update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: g.user.id }).eq('id', b.prompt_id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
