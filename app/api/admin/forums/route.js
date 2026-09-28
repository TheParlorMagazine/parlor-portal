import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { segmentMemberIds } from '../../../../lib/segments'
import { notifyMember } from '../../../../lib/notify'

const MOD_ROLES = ['admin', 'social_admin']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!MOD_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user, me }
}

// GET → all forums (admin view) with segment name.
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const { data, error } = await db.from('forums')
    .select('*, email_segments(name)')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const forums = (data || []).map(f => ({ ...f, segment_name: f.email_segments?.name || null, email_segments: undefined }))
  return Response.json({ forums })
}

// POST { name, description?, guidelines?, tied_to_type?, tied_to_ref?, segment_id? }
// Creates the forum and snapshots the segment's members into forum_members.
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db, user } = g
  let b = {}
  try { b = await request.json() } catch {}
  const name = (b.name || '').trim()
  if (!name) return Response.json({ error: 'Name required' }, { status: 400 })

  const { data: forum, error } = await db.from('forums').insert({
    name,
    description: (b.description || '').trim() || null,
    guidelines: (b.guidelines || '').trim() || null,
    tied_to_type: b.tied_to_type || (b.segment_id ? 'segment' : 'standalone'),
    tied_to_ref: (b.tied_to_ref || '').trim() || null,
    segment_id: b.segment_id || null,
    created_by: user.id,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Snapshot the segment's members (+ the creator as host).
  const ids = new Set()
  if (b.segment_id) {
    const { data: seg } = await db.from('email_segments').select('*').eq('id', b.segment_id).single()
    for (const id of await segmentMemberIds(db, seg)) ids.add(id)
  }
  ids.add(user.id)
  const rows = [...ids].map(member_id => ({ forum_id: forum.id, member_id, role: member_id === user.id ? 'host' : 'member' }))
  if (rows.length) await db.from('forum_members').upsert(rows, { onConflict: 'forum_id,member_id', ignoreDuplicates: true })
  await db.from('forums').update({ member_count: rows.length }).eq('id', forum.id)

  return Response.json({ forum: { ...forum, member_count: rows.length } })
}

// PATCH { id, status } → archive / reactivate
//   or { id, action: 'approve'|'decline' } for a proposed group
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })

  // Approve / decline a member-proposed group.
  if (b.action === 'approve' || b.action === 'decline') {
    const { data: forum } = await db.from('forums').select('id, name, proposed_by, status').eq('id', b.id).single()
    if (!forum) return Response.json({ error: 'Not found' }, { status: 404 })
    if (b.action === 'decline') {
      await db.from('forums').update({ status: 'declined' }).eq('id', b.id)
      if (forum.proposed_by) await notifyMember(db, { memberId: forum.proposed_by, type: 'system', message: `Your group “${forum.name}” wasn’t approved this time`, linkTo: 'groups' })
      return Response.json({ ok: true, status: 'declined' })
    }
    // approve → activate + make the proposer the host (moderator)
    await db.from('forums').update({ status: 'active' }).eq('id', b.id)
    if (forum.proposed_by) {
      await db.from('forum_members').upsert({ forum_id: b.id, member_id: forum.proposed_by, role: 'host' }, { onConflict: 'forum_id,member_id', ignoreDuplicates: true })
      const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', b.id)
      await db.from('forums').update({ member_count: count || 1 }).eq('id', b.id)
      await notifyMember(db, { memberId: forum.proposed_by, type: 'system', message: `Your group “${forum.name}” is live — you’re the moderator!`, linkTo: 'forum', linkRef: b.id })
    }
    return Response.json({ ok: true, status: 'active' })
  }

  if (!['active', 'archived'].includes(b.status)) return Response.json({ error: 'id and status/action required' }, { status: 400 })
  const { error } = await db.from('forums').update({ status: b.status }).eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
