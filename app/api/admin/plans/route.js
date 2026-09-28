import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { status: 401, error: 'Not signed in' }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (me.role !== 'admin') return { status: 403, error: 'Admins only' }
  return { db }
}

export async function GET(request) {
  const g = await gate(request)
  if (g.error) return Response.json({ error: g.error }, { status: g.status })
  const { data, error } = await g.db.from('plans').select('key, label, price, description, perks')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ plans: data || [] })
}

export async function PATCH(request) {
  const g = await gate(request)
  if (g.error) return Response.json({ error: g.error }, { status: g.status })
  let body = {}
  try { body = await request.json() } catch {}
  if (!body.key) return Response.json({ error: 'key required' }, { status: 400 })

  const patch = { updated_at: new Date().toISOString() }
  for (const f of ['label', 'price', 'description']) if (f in body) patch[f] = body[f]
  if ('perks' in body) patch.perks = Array.isArray(body.perks) ? body.perks.map(p => String(p).trim()).filter(Boolean) : []

  const { data, error } = await g.db.from('plans').update(patch).eq('key', body.key).select('key, label, price, description, perks').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ plan: data })
}
