import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { fetchLinkPreview } from '../../../../lib/linkPreview'
import { toEmbedUrl } from '../../../../lib/videoEmbed'
import { notifyAdmins } from '../../../../lib/notify'
import { forumRole } from '../../../../lib/forums'

const SEL = 'id, body, image_url, video_url, link_url, link_title, link_description, link_image, created_at, member_id, forum_id, members!member_posts_member_id_fkey(full_name, avatar_url, headline)'

function shape(p, counts) {
  return {
    id: p.id, body: p.body, image_url: p.image_url, video_url: p.video_url,
    link: p.link_url ? { url: p.link_url, title: p.link_title, description: p.link_description, image: p.link_image } : null,
    created_at: p.created_at, member_id: p.member_id, forum_id: p.forum_id || null,
    author_name: p.members?.full_name || 'Member', author_avatar: p.members?.avatar_url || null, author_headline: p.members?.headline || null,
    comment_count: counts ? (counts[p.id] || 0) : 0,
  }
}

// Count live comments for a set of post ids → { [postId]: n }.
async function commentCounts(db, ids) {
  if (!ids.length) return {}
  const { data } = await db.from('member_post_comments').select('post_id').eq('status', 'live').in('post_id', ids)
  const out = {}
  for (const r of data || []) out[r.post_id] = (out[r.post_id] || 0) + 1
  return out
}

// GET → community posts, ?member_id= for one member's wall, or ?forum_id= for a
// forum feed. Forum posts (forum_id set) never leak into walls or the community
// feed; a forum feed is visible only to that forum's members.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const params = new URL(request.url).searchParams
  const memberId = params.get('member_id')
  const forumId = params.get('forum_id')

  let q = db.from('member_posts').select(SEL).eq('status', 'live').order('created_at', { ascending: false }).limit(50)
  if (forumId) {
    if (!(await forumRole(db, forumId, user.id))) {
      // Admins/super-mods can still oversee; others get nothing.
      const { data: m } = await db.from('members').select('role').eq('id', user.id).maybeSingle()
      if (!m || !['admin', 'social_admin'].includes(m.role)) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })
    }
    q = q.eq('forum_id', forumId)
  } else if (memberId) {
    q = q.eq('member_id', memberId).is('forum_id', null)
  } else {
    q = q.is('forum_id', null)
  }
  let { data, error } = await q
  if (error && (String(error.message).includes('forum_id') || error.code === '42703')) {
    // forum_id column not added yet — fall back to the un-scoped query.
    let q2 = db.from('member_posts').select(SEL.replace(', forum_id', '')).eq('status', 'live').order('created_at', { ascending: false }).limit(50)
    if (memberId && !forumId) q2 = q2.eq('member_id', memberId)
    if (forumId) return Response.json({ posts: [] }) // no forum posts possible pre-migration
    const r = await q2; data = r.data; error = r.error
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const counts = await commentCounts(db, (data || []).map(p => p.id))
  return Response.json({ posts: (data || []).map(p => shape(p, counts)) })
}

// POST { body?, image_url?, video_url?, link_url?, forum_id? } → create a post.
// A forum_id posts into that forum (must be a member); otherwise it's a wall post.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in to post' }, { status: 401 })
  const db = serviceClient()
  let b = {}
  try { b = await request.json() } catch {}
  const body = (b.body || '').trim()
  const imageUrl = (b.image_url || '').trim() || null
  const linkUrl = (b.link_url || '').trim() || null
  // Only accept embeddable YouTube/Vimeo URLs (normalized to a player URL).
  const videoUrl = b.video_url ? toEmbedUrl(b.video_url) : null
  if (!body && !imageUrl && !linkUrl && !videoUrl) return Response.json({ error: 'Say something first' }, { status: 400 })
  if (body.length > 5000) return Response.json({ error: 'Too long' }, { status: 400 })

  const forumId = (b.forum_id || '').trim() || null
  if (forumId && !(await forumRole(db, forumId, user.id))) {
    const { data: m } = await db.from('members').select('role').eq('id', user.id).maybeSingle()
    if (!m || !['admin', 'social_admin'].includes(m.role)) return Response.json({ error: 'Not a member of this forum' }, { status: 403 })
  }

  const row = { member_id: user.id, body: body || null, image_url: imageUrl, video_url: videoUrl, link_url: linkUrl }
  if (forumId) row.forum_id = forumId
  // Fetch a preview for the link (best effort).
  if (linkUrl) {
    const preview = await fetchLinkPreview(linkUrl)
    if (preview) { row.link_title = preview.title; row.link_description = preview.description; row.link_image = preview.image }
  }

  let { data, error } = await db.from('member_posts').insert(row).select(SEL).single()
  if (error && forumId && (String(error.message).includes('forum_id') || error.code === '42703')) {
    return Response.json({ error: 'Run the forum-posts migration first.' }, { status: 500 })
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ post: shape(data, {}) })
}

// DELETE { id } → remove your own post
export async function DELETE(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  // Author can always remove their own post; a forum moderator can remove any
  // post in their forum.
  let del = db.from('member_posts').update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: user.id }).eq('id', b.id)
  const { data: row } = await db.from('member_posts').select('member_id, forum_id').eq('id', b.id).maybeSingle()
  const isMod = row?.forum_id && (await forumRole(db, row.forum_id, user.id)) === 'host'
  if (!isMod) del = del.eq('member_id', user.id)
  const { error } = await del
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

// PATCH { id, action: 'report' } → flag someone else's post
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id || b.action !== 'report') return Response.json({ error: 'id and action required' }, { status: 400 })
  const { data: row } = await db.from('member_posts').select('report_count, status').eq('id', b.id).single()
  if (!row || row.status !== 'live') return Response.json({ error: 'Not found' }, { status: 404 })
  const next = (row.report_count || 0) + 1
  await db.from('member_posts').update({ report_count: next }).eq('id', b.id)
  if (next === 1) await notifyAdmins(db, { type: 'system', message: 'A member post was reported', linkTo: 'admin', linkRef: 'portal' })
  return Response.json({ ok: true })
}
