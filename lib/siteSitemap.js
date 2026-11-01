import { SECTIONS } from '../app/borderlands-of-identity/_data'

const SITE = 'https://theparlormagazine.com'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PUBLIC_PATHS = [
  '/', '/shop', '/about/mission', '/plans', '/privacy', '/terms',
  '/buy-us-a-birthday-gift', '/trick-or-treat', '/borderlands-of-identity',
  '/work-wealth', '/society-culture', '/world-politics', '/perspectives-identity',
  ...SECTIONS.map(section => `/borderlands-of-identity/${section.slug}`),
]

async function pages(db, table, fields, filter, value) {
  const result = [], size = 500
  for (let offset = 0; ; offset += size) {
    const { data, error } = await db.from(table).select(fields).eq(filter, value)
      .order('id', { ascending: true }).range(offset, offset + size - 1)
    if (error || !Array.isArray(data)) throw new Error('Public sitemap data unavailable')
    result.push(...data)
    if (data.length < size) return result
  }
}

const xml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))
const date = value => typeof value === 'string' && value.trim() && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null

export async function siteSitemap(db, now = new Date()) {
  const [articles, products, bundles] = await Promise.all([
    pages(db, 'articles', 'id, slug, published, date_published, issue_id', 'published', true),
    pages(db, 'shop_products', 'id, active, updated_at', 'active', true),
    pages(db, 'shop_bundles', 'id, active', 'active', true),
  ])
  const urls = new Map(PUBLIC_PATHS.map(path => [SITE + path, null]))
  for (const article of articles) {
    if (article.published !== true || typeof article.slug !== 'string' || !article.slug.trim() || /[\u0000-\u001f\u007f]/.test(article.slug)) continue
    const published = date(article.date_published)
    if (published && Date.parse(published) > now.getTime()) continue
    let slug
    try { slug = encodeURIComponent(article.slug) } catch { continue }
    urls.set(`${SITE}/post/${slug}`, published)
    // Include only issues represented by already-published articles.
    if (UUID.test(article.issue_id || '')) urls.set(`${SITE}/issue/${article.issue_id}`, null)
  }
  for (const product of [...products, ...bundles]) {
    if (product.active !== true || !UUID.test(product.id || '')) continue
    const modified = date(product.updated_at)
    urls.set(`${SITE}/shop/${product.id}`, modified && Date.parse(modified) <= now.getTime() ? modified : null)
  }
  if (urls.size > 50000) throw new Error('Sitemap needs splitting before publication')
  const entries = [...urls].map(([url, modified]) => `<url><loc>${xml(url)}</loc>${modified ? `<lastmod>${xml(modified)}</lastmod>` : ''}</url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`
}
