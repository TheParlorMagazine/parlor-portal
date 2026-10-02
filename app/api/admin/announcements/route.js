import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

const FIELDS = ['kicker', 'headline', 'message', 'cta_label', 'cta_href', 'type', 'active', 'sort', 'starts_at', 'ends_at', 'image_url', 'placement']
// Columns from a later migration; drop them and retry if the DB doesn't have them yet.
const NEWER = ['image_url', 'placement']
async function saveResilient(query, patch, buildRetry) {
  let { data, error } = await query(patch)
  if (error && NEWER.some(c => new RegExp(c).test(error.message || ''))) {
    const rest = { ...patch }; NEWER.forEach(c => delete rest[c])
    const r = await buildRetry(rest); data = r.data; error = r.error
  }
  return { data, error }
}
function pick(b) {
  const out = {}
  for (const f of FIELDS) if (f in b) out[f] = b[f] === '' ? null : b[f]
  if ('sort' in out) out.sort = Number(out.sort) || 0
  if ('active' in out) out.active = !!out.active
  return out
}

// GET → all announcements (admin view).
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { data, error } = await g.db.from('announcements').select('*').order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ announcements: data || [] })
}

// POST { ...fields } → create
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  const patch = { ...pick(b), type: pick(b).type || 'general' }
  const { data, error } = await saveResilient(
    p => g.db.from('announcements').insert(p).select().single(),
    patch,
    rest => g.db.from('announcements').insert(rest).select().single()
  )
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ announcement: data })
}

// PATCH { id, ...fields } → update
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const patch = pick(b)
  if (!Object.keys(patch).length) return Response.json({ ok: true })
  const { data, error } = await saveResilient(
    p => g.db.from('announcements').update(p).eq('id', b.id).select().single(),
    patch,
    rest => Object.keys(rest).length
      ? g.db.from('announcements').update(rest).eq('id', b.id).select().single()
      : g.db.from('announcements').select('*').eq('id', b.id).single()
  )
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ announcement: data })
}

// DELETE { id }
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { error } = await g.db.from('announcements').delete().eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
