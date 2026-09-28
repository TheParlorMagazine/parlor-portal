import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const THEME_ROLES = ['admin', 'editor']

function slugify(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// GET → list themes (name + slug). POST → create a new Library theme.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!THEME_ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await db.from('library_themes').select('name, slug').order('sort_order', { ascending: true })
  return Response.json({ themes: data || [] })
}

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!THEME_ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  let b = {}
  try { b = await request.json() } catch {}
  const name = (b.name || '').trim()
  const description = (b.description || '').trim() || null
  if (!name) return Response.json({ error: 'Theme name required' }, { status: 400 })

  // If it already exists (case-insensitive), just return it (updating its
  // description if one was provided and it had none).
  const { data: existing } = await db.from('library_themes').select('name, description').ilike('name', name).maybeSingle()
  if (existing) {
    if (description && !existing.description) await db.from('library_themes').update({ description }).ilike('name', name)
    return Response.json({ theme: { name: existing.name }, existed: true })
  }

  const { data: last } = await db.from('library_themes').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const nextSort = (last?.sort_order || 0) + 1
  const { data, error } = await db.from('library_themes')
    .insert({ name, slug: slugify(name), description, sort_order: nextSort })
    .select('name, slug').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ theme: data })
}
