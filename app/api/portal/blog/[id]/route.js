import { requireUser, serviceClient } from '../../../../../lib/apiAuth'

// GET → a released member blog post (feed_visible submission), members-only.
// The author can also preview their own even before it's released.
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const { data: s } = await db.from('member_submissions')
    .select('id, title, subtitle, body, byline, cover_image_url, status, feed_visible, published_article_id, created_at, member_id, members!member_submissions_member_id_fkey(full_name, avatar_url)')
    .eq('id', id).single()
  if (!s) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!s.feed_visible && s.member_id !== user.id) return Response.json({ error: 'Not available' }, { status: 403 })

  // If it was published into the magazine, offer the article link.
  let articleSlug = null
  if (s.published_article_id) {
    const { data: art } = await db.from('articles').select('slug, published').eq('id', s.published_article_id).maybeSingle()
    if (art?.published) articleSlug = art.slug
  }

  return Response.json({ post: {
    id: s.id, title: s.title, subtitle: s.subtitle, body: s.body,
    byline: (s.byline || '').trim() || s.members?.full_name || 'A Parlor member',
    author_id: s.member_id, author_avatar: s.members?.avatar_url || null,
    cover_image_url: s.cover_image_url, status: s.status, created_at: s.created_at,
    article_slug: articleSlug, is_self: s.member_id === user.id,
  } })
}
