import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { notifyAdmins } from '../../../../lib/notify'

// GET → all active groups (visible to everyone), with this member's join state.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()

  const { data: forums, error } = await db.from('forums')
    .select('id, name, description, join_policy, member_count, thread_count, tied_to_type, created_at')
    .eq('status', 'active').order('member_count', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const [{ data: mine }, { data: reqs }] = await Promise.all([
    db.from('forum_members').select('forum_id, role').eq('member_id', user.id),
    db.from('forum_join_requests').select('forum_id, status').eq('member_id', user.id).eq('status', 'pending'),
  ])
  const roleByForum = Object.fromEntries((mine || []).map(m => [m.forum_id, m.role]))
  const pending = new Set((reqs || []).map(r => r.forum_id))

  const groups = (forums || []).map(f => ({
    ...f,
    my_role: roleByForum[f.id] || null,
    requested: pending.has(f.id),
  }))
  return Response.json({ groups })
}

// POST { name, description?, join_policy? } → propose a group (needs Master Admin approval)
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  let b = {}
  try { b = await request.json() } catch {}
  const name = (b.name || '').trim()
  if (!name) return Response.json({ error: 'Group name required' }, { status: 400 })
  const policy = ['open', 'request', 'paid'].includes(b.join_policy) ? b.join_policy : 'request'

  const { data: forum, error } = await db.from('forums').insert({
    name, description: (b.description || '').trim() || null,
    join_policy: policy, status: 'pending',
    proposed_by: user.id, created_by: user.id,
    tied_to_type: 'group', member_count: 0,
  }).select('id, name').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
  await notifyAdmins(db, { type: 'system', message: `${me?.full_name || 'A member'} proposed a new group: “${name}”`, linkTo: 'admin', linkRef: 'portal' })
  return Response.json({ group: forum })
}
