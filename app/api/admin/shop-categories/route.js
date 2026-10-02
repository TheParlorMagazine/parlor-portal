import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

// Distinct categories actually used by products (fallback when the table is missing).
async function derived(db) {
  const { data } = await db.from('shop_products').select('category')
  const names = [...new Set((data || []).map(r => r.category).filter(Boolean))].sort()
  return names.map(name => ({ id: null, name }))
}

// GET → all categories (admin view).
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { data, error } = await g.db.from('shop_categories').select('id, name, sort').order('sort', { ascending: true }).order('name', { ascending: true })
  if (error) return Response.json({ categories: await derived(g.db), migrated: false })
  return Response.json({ categories: data || [], migrated: true })
}

// POST { name } → add a category.
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  const name = (b.name || '').trim()
  if (!name) return Response.json({ error: 'Name required' }, { status: 400 })
  const { data: max } = await g.db.from('shop_categories').select('sort').order('sort', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await g.db.from('shop_categories').insert({ name, sort: (max?.sort ?? -1) + 1 }).select().single()
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return Response.json({ error: 'That category already exists' }, { status: 409 })
    if (/relation .* does not exist/i.test(error.message)) return Response.json({ error: 'Run the shop_categories migration first' }, { status: 400 })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ category: data })
}

// DELETE { id | name } → remove a category, only if no products use it.
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  let name = b.name
  if (!name && b.id) {
    const { data } = await g.db.from('shop_categories').select('name').eq('id', b.id).maybeSingle()
    name = data?.name
  }
  if (!name) return Response.json({ error: 'id or name required' }, { status: 400 })
  const { count } = await g.db.from('shop_products').select('id', { count: 'exact', head: true }).eq('category', name)
  if (count && count > 0) return Response.json({ error: `Category still has ${count} product${count === 1 ? '' : 's'}` }, { status: 409 })
  const q = b.id ? g.db.from('shop_categories').delete().eq('id', b.id) : g.db.from('shop_categories').delete().eq('name', name)
  const { error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
