import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { fetchLinkPreview } from '../../../../lib/linkPreview'
import { toEmbedUrl } from '../../../../lib/videoEmbed'
import { notifyAdmins } from '../../../../lib/notify'

const SEL = 'id, body, image_url, video_url, link_url, link_title, link_description, link_image, created_at, member_id, members!member_posts_member_id_fkey(full_name, avatar_url, headline)'

function shape(p) {
  return {
    id: p.id, body: p.body, image_url: p.image_url, video_url: p.video_url,
    link: p.link_url ? { url: p.link_url, title: p.link_title, description: p.link_description, image: p.link_image } : null,
    created_at: p.created_at, member_id: p.member_id,
    author_name: p.members?.full_name || 'Member', author_avatar: p.members?.avatar_url || null, author_headline: p.members?.headline || null,
  }
}

// GET → community posts (newest first), or ?member_id= for one member's wall.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const memberId = new URL(request.url).searchParams.get('member_id')
  let q = db.from('member_posts').select(SEL).eq('status', 'live').order('created_at', { ascending: false }).limit(50)
  if (memberId) q = q.eq('member_id', memberId)
  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ posts: (data || []).map(shape) })
}

// POST { body?, image_url?, link_url? } → create a post (any member)
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

  const row = { member_id: user.id, body: body || null, image_url: imageUrl, video_url: videoUrl, link_url: linkUrl }
  // Fetch a preview for the link (best effort).
  if (linkUrl) {
    const preview = await fetchLinkPreview(linkUrl)
    if (preview) { row.link_title = preview.title; row.link_description = preview.description; row.link_image = preview.image }
  }

  const { data, error } = await db.from('member_posts').insert(row).select(SEL).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ post: shape(data) })
}

// DELETE { id } → remove your own post
export async function DELETE(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('member_posts').update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: user.id }).eq('id', b.id).eq('member_id', user.id)
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
