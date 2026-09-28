import { requireUser, serviceClient, memberOf } from '../../../../../../lib/apiAuth'
import { predefinedMemberIds, segmentMemberIds } from '../../../../../../lib/segments'

const SEG_ROLES = ['admin', 'social_admin']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!SEG_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

async function recount(db, segmentId) {
  const { count } = await db.from('email_segment_members').select('member_id', { count: 'exact', head: true }).eq('segment_id', segmentId)
  await db.from('email_segments').update({ member_count: count || 0, last_updated_at: new Date().toISOString() }).eq('id', segmentId)
  return count || 0
}

// GET → the members of this segment (resolved), with name/email/plan.
export async function GET(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const { id } = await params
  const { data: seg } = await db.from('email_segments').select('*').eq('id', id).single()
  if (!seg) return Response.json({ error: 'Not found' }, { status: 404 })

  const ids = await segmentMemberIds(db, seg)
  if (ids.length === 0) return Response.json({ segment: seg, members: [] })
  const { data: members } = await db.from('members').select('id, full_name, email, plan').in('id', ids).order('full_name')
  return Response.json({ segment: seg, members: members || [] })
}

// POST { member_ids?, emails?, from_predefined? } → add members (manual segments only)
export async function POST(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const { id } = await params
  const { data: seg } = await db.from('email_segments').select('*').eq('id', id).single()
  if (!seg) return Response.json({ error: 'Not found' }, { status: 404 })
  if ((seg.filter_type || 'manual') !== 'manual') {
    return Response.json({ error: 'This segment is computed automatically — members can’t be added manually.' }, { status: 400 })
  }

  let b = {}
  try { b = await request.json() } catch {}
  const ids = new Set((b.member_ids || []).filter(Boolean))

  if (Array.isArray(b.emails) && b.emails.length) {
    const emails = b.emails.map(e => String(e).trim().toLowerCase()).filter(Boolean)
    const { data } = await db.from('members').select('id, email').in('email', emails)
    for (const m of data || []) ids.add(m.id)
  }
  if (b.from_predefined) {
    for (const mid of await predefinedMemberIds(db, b.from_predefined)) ids.add(mid)
  }

  if (ids.size === 0) return Response.json({ error: 'No members matched' }, { status: 400 })
  const rows = [...ids].map(member_id => ({ segment_id: id, member_id }))
  const { error } = await db.from('email_segment_members').upsert(rows, { onConflict: 'segment_id,member_id', ignoreDuplicates: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const count = await recount(db, id)
  return Response.json({ ok: true, added: ids.size, member_count: count })
}

// DELETE { member_id } → remove one member
export async function DELETE(request, { params }) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const { id } = await params
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.member_id) return Response.json({ error: 'member_id required' }, { status: 400 })
  const { error } = await db.from('email_segment_members').delete().eq('segment_id', id).eq('member_id', b.member_id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const count = await recount(db, id)
  return Response.json({ ok: true, member_count: count })
}
