import { requireUser, serviceClient } from '../../../../../lib/apiAuth'

// GET → invite details (public, so a logged-out invitee can see what they're
// joining before signing up).
export async function GET(request, { params }) {
  const db = serviceClient()
  const { token } = await params
  const { data: inv } = await db.from('forum_invites')
    .select('id, status, forum_id, forums(id, name, description, member_count)')
    .eq('token', token).maybeSingle()
  if (!inv) return Response.json({ error: 'Invite not found' }, { status: 404 })
  return Response.json({
    status: inv.status,
    forum: inv.forums ? { id: inv.forums.id, name: inv.forums.name, description: inv.forums.description, member_count: inv.forums.member_count } : null,
  })
}

// POST → redeem the invite (signed-in). Joins the forum.
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in to accept' }, { status: 401 })
  const db = serviceClient()
  const { token } = await params

  const { data: inv } = await db.from('forum_invites').select('id, status, forum_id').eq('token', token).maybeSingle()
  if (!inv) return Response.json({ error: 'Invite not found' }, { status: 404 })
  if (inv.status === 'revoked') return Response.json({ error: 'This invite is no longer valid' }, { status: 400 })

  await db.from('forum_members').upsert({ forum_id: inv.forum_id, member_id: user.id, role: 'member' }, { onConflict: 'forum_id,member_id', ignoreDuplicates: true })
  const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', inv.forum_id)
  await db.from('forums').update({ member_count: count || 0 }).eq('id', inv.forum_id)
  if (inv.status !== 'accepted') await db.from('forum_invites').update({ status: 'accepted', accepted_by: user.id, accepted_at: new Date().toISOString() }).eq('id', inv.id)

  return Response.json({ ok: true, forum_id: inv.forum_id })
}
