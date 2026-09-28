import { requireUser, serviceClient } from '../../../../../lib/apiAuth'

// GET → a member's public-facing profile (members-only surface).
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  const { data, error } = await db.from('members')
    .select('id, full_name, headline, bio, avatar_url, banner_url, role, joined_at')
    .eq('id', id).single()
  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  // This member's published Community articles (their "Written for The Parlor").
  const { data: articles } = await db.from('articles')
    .select('id, slug, title, cover_image_url, date_published')
    .eq('community_author_id', id).eq('published', true)
    .order('date_published', { ascending: false }).limit(12)

  // Their released blog posts (feed-visible submissions).
  const { data: blogs } = await db.from('member_submissions')
    .select('id, title, subtitle, cover_image_url, status, reviewed_at, created_at')
    .eq('member_id', id).eq('feed_visible', true)
    .order('reviewed_at', { ascending: false }).limit(12)

  return Response.json({ member: data, articles: articles || [], blog_posts: blogs || [], is_self: user.id === id })
}
