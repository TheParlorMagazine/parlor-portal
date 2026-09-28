import { buildNewsletter } from './newsletter'

// Assembles the CURRENT newsletter from the latest content (no DB writes). The
// newsletter is a living template — this is what it looks like right now.
// Returns { subject, html, articleCount, featured, otherEventCount, hasNew, since }.
// `hasNew` = is there new content since the last sent newsletter (drives the
// biweekly "ready to send" nudge). `db` = service-role Supabase client.
export async function gatherNewsletter(db, { baseUrl = 'https://theparlormagazine.com' } = {}) {
  const now = new Date().toISOString()

  const { data: last } = await db
    .from('email_campaigns').select('sent_at')
    .eq('kind', 'newsletter').eq('status', 'sent')
    .order('sent_at', { ascending: false }).limit(1).maybeSingle()
  const since = last?.sent_at || null

  // Current issue = the issue of the most recent published issue-bound article;
  // feature its intro + the latest 2 articles rolled out from it.
  let issue = null, issueArticles = []
  const { data: recentIssueArt } = await db.from('articles')
    .select('issue_id').eq('published', true).not('issue_id', 'is', null)
    .order('date_published', { ascending: false }).limit(1).maybeSingle()
  if (recentIssueArt?.issue_id) {
    let { data: iss, error: issErr } = await db.from('issues')
      .select('id, title, number, cover_image_url, newsletter_intro, newsletter_image').eq('id', recentIssueArt.issue_id).maybeSingle()
    if (issErr) { // newsletter_intro/image columns not added yet — degrade gracefully
      const r = await db.from('issues').select('id, title, number, cover_image_url').eq('id', recentIssueArt.issue_id).maybeSingle()
      iss = r.data
    }
    issue = iss || null
    const { data: ia } = await db.from('articles')
      .select('slug, title, subtitle, excerpt, cover_image_url, date_published')
      .eq('published', true).eq('issue_id', recentIssueArt.issue_id)
      .order('date_published', { ascending: false }).limit(2)
    issueArticles = ia || []
  }

  // Latest 3 standalone published editorial articles (no member posts, not issue-bound).
  const { data: articles } = await db.from('articles')
    .select('slug, title, subtitle, excerpt, cover_image_url, date_published, media_type, issue_id')
    .eq('published', true)
    .is('issue_id', null)
    .or('media_type.is.null,media_type.neq.member_post')
    .order('date_published', { ascending: false })
    .limit(3)
  const arts = articles || []

  // Featured event (soonest upcoming with the newsletter flag) + other upcoming.
  const { data: featuredRows } = await db.from('events')
    .select('*').eq('status', 'published').eq('featured_in_newsletter', true)
    .gte('starts_at', now).order('starts_at', { ascending: true }).limit(1)
  const featuredEvent = featuredRows?.[0] || null

  const { data: upcoming } = await db.from('events')
    .select('id, title, starts_at, join_url, blurb').eq('status', 'published')
    .gte('starts_at', now).order('starts_at', { ascending: true }).limit(7)
  const otherEvents = (upcoming || []).filter(e => e.id !== featuredEvent?.id).slice(0, 5)

  // New activity since the last send?
  const artsSince = since ? arts.filter(a => a.date_published && a.date_published > since) : arts
  let newEventCount = 0
  if (!since) newEventCount = (upcoming || []).length
  else {
    const { count } = await db.from('events').select('id', { count: 'exact', head: true })
      .eq('status', 'published').gt('created_at', since)
    newEventCount = count || 0
  }
  const issueSince = since ? issueArticles.filter(a => a.date_published && a.date_published > since) : issueArticles
  const hasNew = artsSince.length > 0 || issueSince.length > 0 || newEventCount > 0

  const { subject, html } = buildNewsletter({ articles: arts, issue, issueArticles, featuredEvent, otherEvents, baseUrl })
  return {
    subject, html, since, hasNew,
    articleCount: arts.length + issueArticles.length,
    issueTitle: issue ? `Issue ${issue.number ?? ''} — ${issue.title}`.trim() : null,
    issueId: issue?.id || null,
    issueIntro: issue?.newsletter_intro || '',
    issueImage: issue?.newsletter_image || '',
    issueArticleCount: issueArticles.length,
    featured: !!featuredEvent, featuredTitle: featuredEvent?.title || null,
    otherEventCount: otherEvents.length,
    empty: arts.length === 0 && issueArticles.length === 0 && !featuredEvent && otherEvents.length === 0,
  }
}
