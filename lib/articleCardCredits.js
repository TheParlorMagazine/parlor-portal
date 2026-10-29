import { publicationUrl, articleAuthorName } from './articleRepublication'

const escapeHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Optional enrichment: older schemas or an unavailable metadata query must never
// remove otherwise valid recent/suggested articles from the page.
export async function withRepublicationCardCredits(db, articles) {
  if (!articles?.length) return articles || []
  const slugs = [...new Set(articles.map(a => a.slug).filter(Boolean))]
  if (!slugs.length) return articles
  try {
    const columns = 'slug, is_republished, original_publication_name, original_publication_logo_url'
    const read = fields => db.from('articles').select(fields).eq('published', true).in('slug', slugs)
    let { data, error } = await read(columns + ', republication_authors')
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      // The newer authors migration is optional for the publication credit block.
      ;({ data, error } = await read(columns))
    }
    if (error) return articles
    const credits = new Map((data || []).map(a => [a.slug, a]))
    return articles.map(a => {
      const credit = credits.get(a.slug)
      if (!credit) return a
      const enriched = { ...a, is_republished: credit.is_republished,
        original_publication_name: credit.original_publication_name,
        original_publication_logo_url: credit.original_publication_logo_url }
      return credit.is_republished && Array.isArray(credit.republication_authors) && credit.republication_authors.length
        ? { ...enriched, author_name: articleAuthorName({ ...enriched, republication_authors: credit.republication_authors }) }
        : enriched
    })
  } catch { return articles }
}

// This contains no anchors, so it is also valid inside a linked suggested card.
// Both placements use the same escaped markup, typography and logo treatment.
export function republishedCardCreditHtml(article) {
  if (!article?.is_republished || !article.original_publication_name?.trim()) return ''
  const logo = publicationUrl(article.original_publication_logo_url)
  const publication = escapeHtml(article.original_publication_name.trim())
  const author = escapeHtml(article.author_name)
  return `<div data-republished-card-credit style="display:flex;align-items:center;gap:10px;border-top:1px solid #eadde0;padding-top:10px;margin-top:12px;font-family:'Source Serif 4',Georgia,serif;overflow-wrap:anywhere;">
    ${logo ? `<img src="${escapeHtml(logo)}" alt="${publication} logo" loading="lazy" decoding="async" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;">` : ''}
    <div style="min-width:0;">
      ${author ? `<div style="font-size:13px;line-height:1.45;font-weight:500;color:#555;">${author}</div>` : ''}
      <em style="display:block;margin-top:3px;font-size:12px;line-height:1.5;font-style:italic;color:#7A263A;">Republished from <span style="font-weight:600;">${publication}</span></em>
    </div>
  </div>`
}
