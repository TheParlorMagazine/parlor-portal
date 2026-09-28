import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { PREDEFINED, predefinedCounts } from '../../../../lib/segments'

// Segment management — gated to the Emails/Portal roles.
const SEG_ROLES = ['admin', 'social_admin']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!SEG_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

// GET → { custom: [segment rows], predefined: [{key,name,type,desc,count}] }
export async function GET(request) {
  const g = await gate(request)
  if (g.error) return g.error
  const { db } = g
  const [{ data: custom }, counts] = await Promise.all([
    db.from('email_segments').select('*').order('created_at', { ascending: false }),
    predefinedCounts(db),
  ])
  const predefined = PREDEFINED.map(p => ({ key: p.key, name: p.name, type: p.type, desc: p.desc, count: counts[p.key] || 0 }))
  return Response.json({ custom: custom || [], predefined })
}

// POST { name, description?, filter_type? } → create a segment
export async function POST(request) {
  const g = await gate(request)
  if (g.error) return g.error
  const { db, user } = g
  let b = {}
  try { b = await request.json() } catch {}
  const name = (b.name || '').trim()
  if (!name) return Response.json({ error: 'Name required' }, { status: 400 })
  const now = new Date().toISOString()
  const { data, error } = await db.from('email_segments')
    .insert({ name, description: (b.description || '').trim() || null, filter_type: b.filter_type || 'manual', filter_config: b.filter_config || {}, member_count: 0, created_by: user.id, created_at: now, last_updated_at: now })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ segment: data })
}

// DELETE { id }
export async function DELETE(request) {
  const g = await gate(request)
  if (g.error) return g.error
  const { db } = g
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('email_segments').delete().eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
