import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { forumRole, effectiveForumRole } from '../../../../../lib/forums'
import { hasPaidAccess } from '../../../../../lib/plans'
import { notifyMember } from '../../../../../lib/notify'

async function recount(db, forumId) {
  const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', forumId)
  await db.from('forums').update({ member_count: count || 0 }).eq('id', forumId)
  return count || 0
}
async function notifyHosts(db, forumId, payload, exceptId) {
  const { data: hosts } = await db.from('forum_members').select('member_id').eq('forum_id', forumId).eq('role', 'host')
  for (const h of hosts || []) { if (h.member_id !== exceptId) await notifyMember(db, { memberId: h.member_id, ...payload }) }
}

// GET → group + (for moderators) pending requests and member list.
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  let { data: group, error: gErr } = await db.from('forums').select('id, name, description, cover_image_url, avatar_url, join_policy, member_count, status').eq('id', id).single()
  if (gErr) { const r = await db.from('forums').select('id, name, description, cover_image_url, join_policy, member_count, status').eq('id', id).single(); group = r.data; gErr = r.error }
  if (gErr) { const r = await db.from('forums').select('id, name, description, join_policy, member_count, status').eq('id', id).single(); group = r.data }
  if (!group) return Response.json({ error: 'Not found' }, { status: 404 })
  const role = await effectiveForumRole(db, id, user.id)

  let requests = [], members = []
  if (role === 'host') {
    const { data: rq } = await db.from('forum_join_requests')
      .select('member_id, created_at, members(full_name, avatar_url)').eq('forum_id', id).eq('status', 'pending').order('created_at')
    requests = (rq || []).map(r => ({ member_id: r.member_id, created_at: r.created_at, name: r.members?.full_name || 'Member', avatar: r.members?.avatar_url || null }))
    const { data: mm } = await db.from('forum_members').select('member_id, role, members(full_name, avatar_url)').eq('forum_id', id).order('role')
    members = (mm || []).map(m => ({ member_id: m.member_id, role: m.role, name: m.members?.full_name || 'Member', avatar: m.members?.avatar_url || null }))
  }
  return Response.json({ group, my_role: role, requests, members })
}

// POST → join (per policy)
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const { data: group } = await db.from('forums').select('id, name, join_policy, status').eq('id', id).single()
  if (!group || group.status !== 'active') return Response.json({ error: 'Group not available' }, { status: 404 })
  if (await forumRole(db, id, user.id)) return Response.json({ ok: true, state: 'member' })

  if (group.join_policy === 'paid') {
    const me = await memberOf(db, user.id)
    if (!hasPaidAccess(me)) return Response.json({ error: 'This group is for paid members.', state: 'upgrade' }, { status: 403 })
  }

  if (group.join_policy === 'request') {
    await db.from('forum_join_requests').upsert({ forum_id: id, member_id: user.id, status: 'pending' }, { onConflict: 'forum_id,member_id' })
    const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
    await notifyHosts(db, id, { type: 'system', message: `${me?.full_name || 'A member'} asked to join ${group.name}`, linkTo: 'forum', linkRef: id }, user.id)
    return Response.json({ ok: true, state: 'requested' })
  }

  // open (or paid + paid member) → join instantly
  await db.from('forum_members').upsert({ forum_id: id, member_id: user.id, role: 'member' }, { onConflict: 'forum_id,member_id', ignoreDuplicates: true })
  await recount(db, id)
  return Response.json({ ok: true, state: 'member' })
}

// DELETE → leave the group
export async function DELETE(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  await db.from('forum_members').delete().eq('forum_id', id).eq('member_id', user.id)
  await db.from('forum_join_requests').delete().eq('forum_id', id).eq('member_id', user.id)
  await recount(db, id)
  return Response.json({ ok: true, state: 'none' })
}

// PATCH → moderator: set policy, or approve/decline a join request, or add members
export async function PATCH(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  if (await effectiveForumRole(db, id, user.id) !== 'host') return Response.json({ error: 'Moderators only' }, { status: 403 })
  let b = {}
  try { b = await request.json() } catch {}

  if (b.join_policy && ['open', 'request', 'paid'].includes(b.join_policy)) {
    await db.from('forums').update({ join_policy: b.join_policy }).eq('id', id)
    return Response.json({ ok: true })
  }
  // Edit forum name / description / cover banner / profile image (host/admin).
  if ('name' in b || 'description' in b || 'cover_image_url' in b || 'avatar_url' in b) {
    const patch = {}
    if ('name' in b) { const nm = (b.name || '').trim(); if (!nm) return Response.json({ error: 'Name required' }, { status: 400 }); patch.name = nm }
    if ('description' in b) patch.description = (b.description || '').trim() || null
    if ('cover_image_url' in b) patch.cover_image_url = (b.cover_image_url || '').trim() || null
    if ('avatar_url' in b) patch.avatar_url = (b.avatar_url || '').trim() || null
    let { error } = await db.from('forums').update(patch).eq('id', id)
    if (error && ('cover_image_url' in patch || 'avatar_url' in patch)) { // image columns not added yet — save the rest
      const { cover_image_url, avatar_url, ...rest } = patch
      if (Object.keys(rest).length) { const r = await db.from('forums').update(rest).eq('id', id); error = r.error }
      else error = null
    }
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }
  // Promote/demote a member (moderator = host role).
  if (b.set_role_member_id && ['host', 'member'].includes(b.role)) {
    if (b.role === 'member') { // demoting — keep at least one moderator
      const { data: tgt } = await db.from('forum_members').select('role').eq('forum_id', id).eq('member_id', b.set_role_member_id).maybeSingle()
      if (tgt?.role === 'host') {
        const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', id).eq('role', 'host')
        if ((count || 0) <= 1) return Response.json({ error: 'Keep at least one moderator.' }, { status: 400 })
      }
    }
    await db.from('forum_members').update({ role: b.role }).eq('forum_id', id).eq('member_id', b.set_role_member_id)
    if (b.role === 'host') await notifyMember(db, { memberId: b.set_role_member_id, type: 'system', message: `You’re now a moderator of a Parlor forum`, linkTo: 'forum', linkRef: id })
    return Response.json({ ok: true })
  }
  // Remove a member from the forum.
  if (b.remove_member_id) {
    const { data: tgt } = await db.from('forum_members').select('role').eq('forum_id', id).eq('member_id', b.remove_member_id).maybeSingle()
    if (tgt?.role === 'host') {
      const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', id).eq('role', 'host')
      if ((count || 0) <= 1) return Response.json({ error: 'Can’t remove the last moderator.' }, { status: 400 })
    }
    await db.from('forum_members').delete().eq('forum_id', id).eq('member_id', b.remove_member_id)
    await recount(db, id)
    return Response.json({ ok: true })
  }
  if (b.request_member_id && ['approve', 'decline'].includes(b.action)) {
    if (b.action === 'approve') {
      await db.from('forum_members').upsert({ forum_id: id, member_id: b.request_member_id, role: 'member' }, { onConflict: 'forum_id,member_id', ignoreDuplicates: true })
      await db.from('forum_join_requests').update({ status: 'approved' }).eq('forum_id', id).eq('member_id', b.request_member_id)
      await recount(db, id)
      const { data: g } = await db.from('forums').select('name').eq('id', id).single()
      await notifyMember(db, { memberId: b.request_member_id, type: 'system', message: `You’re in — welcome to ${g?.name || 'the group'}`, linkTo: 'forum', linkRef: id })
    } else {
      await db.from('forum_join_requests').update({ status: 'declined' }).eq('forum_id', id).eq('member_id', b.request_member_id)
    }
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'Nothing to do' }, { status: 400 })
}
