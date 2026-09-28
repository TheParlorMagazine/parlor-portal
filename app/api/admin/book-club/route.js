import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const BOOK_ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!BOOK_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

const FIELDS = ['title', 'author', 'cover_image_url', 'book_url', 'blurb', 'status', 'meeting_at', 'sort']
function pick(b) {
  const out = {}
  for (const f of FIELDS) if (f in b) out[f] = b[f] === '' ? null : b[f]
  return out
}

// GET → all books (admin view, all statuses)
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { data, error } = await g.db.from('book_club')
    .select('*').order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ books: data || [] })
}

// POST → create a book
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!(b.title || '').trim()) return Response.json({ error: 'Title required' }, { status: 400 })
  const { data, error } = await g.db.from('book_club').insert({ ...pick(b), created_by: g.user.id }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ book: data })
}

// PATCH { id, ...fields } → update a book
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await g.db.from('book_club').update(pick(b)).eq('id', b.id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ book: data })
}

// DELETE { id } → remove a book (cascades prompts/replies)
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { error } = await g.db.from('book_club').delete().eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
