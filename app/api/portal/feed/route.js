import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { hasPaidAccess } from '../../../../lib/plans'

// Dashboard "feed" — COMMUNITY activity only (new articles live in the "New in
// the Library" highlight, not here):
//   • member posts ("Share with The Parlor" wall)
//   • member comments (across all articles)
//   • forum thread previews — ONLY from the private rooms this member belongs to
//   • book-club discussion prompt previews — paid members only
// Members-only surface, so gated like the rest of the portal.

function excerpt(html, n = 180) {
  const text = (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > n ? text.slice(0, n).trimEnd() + '…' : text
}

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()

  // The forums this member is in — feed forum activity is scoped to these.
  const { data: memberships } = await db.from('forum_members').select('forum_id').eq('member_id', user.id)
  const forumIds = (memberships || []).map(m => m.forum_id)
  const me = await memberOf(db, user.id)
  const paid = hasPaidAccess(me)

  const [postRes, blogRes, comRes, thrRes, promptRes] = await Promise.all([
    db.from('member_posts')
      .select('id, member_id, body, image_url, video_url, link_url, link_title, link_image, created_at, members!member_posts_member_id_fkey(full_name, avatar_url, headline)')
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(20),
    db.from('member_submissions')
      .select('id, member_id, title, subtitle, excerpt, body, byline, cover_image_url, status, reviewed_at, created_at, published_article_id, members!member_submissions_member_id_fkey(full_name, avatar_url), articles!member_submissions_published_article_id_fkey(slug, published, media_type)')
      .eq('feed_visible', true)
      .order('reviewed_at', { ascending: false })
      .limit(12),
    db.from('article_comments')
      .select('id, body, created_at, article_id, members!article_comments_member_id_fkey(full_name, avatar_url), articles(title, slug)')
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .limit(20),
    forumIds.length
      ? db.from('forum_threads')
          .select('id, title, body, forum_id, last_activity_at, created_at, member_id, members!forum_threads_member_id_fkey(full_name, avatar_url), forums(name)')
          .in('forum_id', forumIds)
          .eq('status', 'live')
          .order('last_activity_at', { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    paid
      ? db.from('book_prompts')
          .select('id, title, body, book_id, last_activity_at, created_at, members!book_prompts_member_id_fkey(full_name, avatar_url), book_club(title)')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ])

  const posts = (postRes.data || []).map(p => ({
    kind: 'post',
    id: p.id,
    ts: p.created_at,
    author_id: p.member_id,
    body: excerpt(p.body, 280),
    image_url: p.image_url || null,
    video_url: p.video_url || null,
    link: p.link_url ? { url: p.link_url, title: p.link_title, image: p.link_image } : null,
    author_name: p.members?.full_name || 'Member',
    author_avatar: p.members?.avatar_url || null,
    author_headline: p.members?.headline || null,
  }))

  const blogs = (blogRes.data || []).map(s => {
    // Once the edited article is live, the community card points at it.
    const art = s.articles || null
    const articleSlug = (s.status === 'published' && art?.published) ? art.slug : null
    return {
      kind: 'blogpost',
      id: s.id,
      ts: s.reviewed_at || s.created_at,
      author_id: s.member_id,
      title: s.title,
      subtitle: s.subtitle,
      body: excerpt(s.excerpt || s.body, 200),
      cover_image_url: s.cover_image_url || null,
      community: s.status === 'approved' || s.status === 'published',
      is_member_post: art?.media_type === 'member_post',
      article_slug: articleSlug,
      author_name: (s.byline || '').trim() || s.members?.full_name || 'Member',
      author_avatar: s.members?.avatar_url || null,
    }
  })

  const comments = (comRes.data || []).map(c => ({
    kind: 'comment',
    id: c.id,
    ts: c.created_at,
    author_name: c.members?.full_name || 'Member',
    author_avatar: c.members?.avatar_url || null,
    body: excerpt(c.body),
    article_title: c.articles?.title || null,
    article_slug: c.articles?.slug || null,
  }))

  const threads = (thrRes.data || []).map(t => ({
    kind: 'forum',
    id: t.id,
    ts: t.last_activity_at || t.created_at,
    title: t.title,
    body: excerpt(t.body),
    forum_id: t.forum_id,
    forum_name: t.forums?.name || 'a forum',
    author_name: t.members?.full_name || 'Member',
    author_avatar: t.members?.avatar_url || null,
  }))

  const prompts = (promptRes.data || []).map(p => ({
    kind: 'bookclub',
    id: p.id,
    ts: p.created_at,
    title: p.title,
    body: excerpt(p.body),
    book_id: p.book_id,
    book_title: p.book_club?.title || 'the book club',
    author_name: p.members?.full_name || 'The Parlor',
    author_avatar: p.members?.avatar_url || null,
  }))

  const items = [...posts, ...blogs, ...comments, ...threads, ...prompts]
    .filter(i => i.ts)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 25)

  return Response.json({ items })
}
