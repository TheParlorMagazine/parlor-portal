import { publicationUrl, articleAuthorName } from '../../lib/articleRepublication'

export default function RepublishedByline({ article, publishedDate, dark = false }) {
  if (!article?.is_republished) return null
  const color = dark ? '#fff' : '#0a0a0a'
  const muted = dark ? 'rgba(255,255,255,.8)' : '#666'
  const dateValue = article.original_publication_date || ''
  const originalDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) && !Number.isNaN(Date.parse(dateValue))
    ? new Date(dateValue + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : null
  // The credit links only to the source article, never the publication homepage.
  const originalUrl = publicationUrl(article.original_article_url)
  const logo = publicationUrl(article.original_publication_logo_url)
  const licenseUrl = publicationUrl(article.republication_license_url)
  return <div data-republished-byline style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color, fontFamily: "'Source Serif 4', Georgia, serif", marginBottom: dark ? 0 : 40, pointerEvents: 'auto', overflowWrap: 'anywhere' }}>
    {logo && <img src={logo} alt={`${article.original_publication_name || 'Original publication'} logo`} style={{ width: dark ? 44 : 36, height: dark ? 44 : 36, objectFit: 'contain', flexShrink: 0 }} />}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: dark ? 16 : 14 }}>By {articleAuthorName(article) || 'Original author not specified'}</div>
      <div data-republication-attribution style={{ fontSize: 13, lineHeight: 1.6, marginTop: 4, color: muted }}>
        Originally published by {originalUrl ? <a href={originalUrl} style={{ color: dark ? '#fff' : '#7A263A', textDecoration: 'underline', textUnderlineOffset: 3 }}>{article.original_publication_name}</a> : <span>{article.original_publication_name}</span>}{originalDate && <> on {originalDate}</>}.
      </div>
      {article.republication_license && <div data-republication-license style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4, color: muted }}>{licenseUrl ? <a href={licenseUrl} style={{ color: dark ? '#fff' : '#7A263A', textDecoration: 'underline', textUnderlineOffset: 3 }}>{article.republication_license}</a> : article.republication_license}</div>}
      {publishedDate && <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.6)' : '#999', marginTop: 4 }}>{publishedDate}</div>}
    </div>
  </div>
}
