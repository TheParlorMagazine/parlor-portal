import { serviceClient } from './apiAuth'

// Server-side homepage data — everything the visible home sections need, fetched
// in parallel on the server so the page renders with content already in the HTML
// (no client fetch waterfall; the hero no longer loads last). The per-user member
// lookup and the hamburger issue list stay client-side.
export async function getHomeData() {
  const db = serviceClient()
  const nowISO = new Date().toISOString()

  const [artR, latestR, bannersR, ribbonR, events] = await Promise.all([
    db.from('articles')
      .select('slug, title, subtitle, cover_image_url, author_name, author_photo_url, author_profile_url, category, date_published')
      .eq('published', true).is('issue_id', null).or('media_type.is.null,media_type.neq.member_post')
      .order('date_published', { ascending: false }).limit(6),
    db.from('articles').select('issue_id').eq('published', true).not('issue_id', 'is', null)
      .or('media_type.is.null,media_type.neq.member_post').order('date_published', { ascending: false }).limit(1),
    db.from('announcements')
      .select('id, kicker, headline, message, cta_label, cta_href, image_url, type, starts_at, ends_at, sort')
      .eq('active', true).eq('placement', 'homepage').order('sort', { ascending: true }).order('created_at', { ascending: false }),
    db.from('announcements')
      .select('id, kicker, headline, message, cta_label, cta_href, type, starts_at, ends_at, sort, placement')
      .eq('active', true).order('sort', { ascending: true }).order('created_at', { ascending: false }),
    upcomingEvents(db, nowISO),
  ])

  // Hero: newest issue (owner of the latest issue article) + its 3 newest articles.
  let heroIssue = null, heroSlides = []
  const issueId = latestR.data?.[0]?.issue_id
  if (issueId) {
    const [metaR, heroArtsR] = await Promise.all([
      db.from('issues').select('id, number, title').eq('id', issueId),
      db.from('articles').select('slug, title, excerpt, subtitle, cover_image_url, category, date_published')
        .eq('published', true).eq('issue_id', issueId).or('media_type.is.null,media_type.neq.member_post')
        .order('date_published', { ascending: false }).limit(3),
    ])
    heroIssue = metaR.data?.[0] || null
    heroSlides = (heroArtsR.data || []).map(a => ({
      url: a.slug ? `/post/${a.slug}` : '#', title: a.title || '',
      subtitle: a.excerpt || a.subtitle || '', cover: a.cover_image_url || '', category: a.category || '',
    }))
  }

  const articles = (artR.data || []).map(a => ({
    url: a.slug ? `/post/${a.slug}` : '#', slug: a.slug || '', cover: a.cover_image_url || '', title: a.title || '',
    excerpt: a.subtitle || '', category: a.category || '', authorName: a.author_name || '',
    authorPhoto: a.author_photo_url || '', authorProfile: a.author_profile_url || '', date: a.date_published || '',
  }))

  const live = a => (!a.starts_at || a.starts_at <= nowISO) && (!a.ends_at || a.ends_at >= nowISO)
  const banners = (bannersR.data || []).filter(live)
  const ribbon = (ribbonR.data || []).filter(a => (a.placement || 'ribbon') !== 'homepage' && live(a))

  return { articles, heroIssue, heroSlides, banners, ribbon, events }
}

async function upcomingEvents(db, nowISO) {
  const baseCols = 'id, title, blurb, cover_image_url, location_type, location, starts_at, host_name'
  let { data, error } = await db.from('events').select(`${baseCols}, featured_home`)
    .eq('status', 'published').gte('starts_at', nowISO).order('starts_at', { ascending: true }).limit(24)
  if (error) {
    const r = await db.from('events').select(baseCols).eq('status', 'published').gte('starts_at', nowISO).order('starts_at', { ascending: true }).limit(24)
    data = r.data; error = r.error
  }
  if (error) return []
  const rows = data || []
  const featured = rows.filter(e => e.featured_home)
  return (featured.length ? featured : rows).slice(0, 3)
}
