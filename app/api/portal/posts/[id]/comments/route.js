import { requireUser, serviceClient } from '../../../../../../lib/apiAuth'
import { forumRole } from '../../../../../../lib/forums'
import { notifyMember } from '../../../../../../lib/notify'

const CSEL = 'id, body, created_at, member_id, members!member_post_comments_member_id_fkey(full_name, avatar_url, headline)'

function shape(c) {
  return {
    id: c.id, body: c.body, created_at: c.created_at, member_id: c.member_id,
    author_name: c.members?.full_name || 'Member', author_avatar: c.members?.avatar_url || null, author_headline: c.members?.headline || null,
  }
}

// Load the post and verify the caller may see/comment on it. Forum posts require
// forum membership (or super-mod); wall posts are open to any signed-in member.
async function access(db, postId, userId) {
  const { data: post } = await db.from('member_posts').select('id, member_id, forum_id, status').eq('id', postId).maybeSingle()
  if (!post || post.status !== 'live') return { error: Response.json({ error: 'Not found' }, { status: 404 }) }
  if (post.forum_id) {
    if (!(await forumRole(db, post.forum_id, userId))) {
      const { data: m } = await db.from('members').select('role').eq('id', userId).maybeSingle()
      if (!m || !['admin', 'social_admin'].includes(m.role)) return { error: Response.json({ error: 'Not a member of this forum' }, { status: 403 }) }
    }
  }
  return { post }
}

// GET → comments on a post (oldest first).
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const gate = await access(db, id, user.id)
  if (gate.error) return gate.error
  const { data } = await db.from('member_post_comments').select(CSEL).eq('post_id', id).eq('status', 'live').order('created_at', { ascending: true }).limit(200)
  return Response.json({ comments: (data || []).map(shape) })
}

// POST { body } → add a comment.
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in to comment' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const gate = await access(db, id, user.id)
  if (gate.error) return gate.error
  let b = {}; try { b = await request.json() } catch {}
  const body = (b.body || '').trim()
  if (!body) return Response.json({ error: 'Write something first' }, { status: 400 })
  if (body.length > 3000) return Response.json({ error: 'Too long' }, { status: 400 })

  const { data, error } = await db.from('member_post_comments').insert({ post_id: id, member_id: user.id, body }).select(CSEL).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Notify the post author (best effort).
  const post = gate.post
  if (post.member_id && post.member_id !== user.id) {
    const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
    const link = post.forum_id ? `forum` : `member`
    const ref = post.forum_id || post.member_id
    await notifyMember(db, { memberId: post.member_id, type: 'system', message: `${me?.full_name || 'A member'} commented on your post`, linkTo: link, linkRef: ref })
  }
  return Response.json({ comment: shape(data) })
}

// DELETE { comment_id } → remove your own comment, or any comment as a forum mod.
export async function DELETE(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  let b = {}; try { b = await request.json() } catch {}
  if (!b.comment_id) return Response.json({ error: 'comment_id required' }, { status: 400 })
  const gate = await access(db, id, user.id)
  if (gate.error) return gate.error
  let del = db.from('member_post_comments').update({ status: 'removed' }).eq('id', b.comment_id).eq('post_id', id)
  const isMod = gate.post.forum_id && (await forumRole(db, gate.post.forum_id, user.id)) === 'host'
  if (!isMod) del = del.eq('member_id', user.id)
  const { error } = await del
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
