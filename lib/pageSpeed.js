const ORIGIN = 'https://theparlormagazine.com'
const PUBLIC_PATHS = new Set(['/', '/shop', '/about/mission', '/plans', '/terms', '/privacy', '/print', '/contact', '/buy-us-a-birthday-gift', '/borderlands-of-identity', '/trick-or-treat', '/work-wealth', '/society-culture', '/world-politics', '/perspectives-identity'])
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

export class PageSpeedError extends Error {
  constructor(message, status = 502) { super(message); this.status = status }
}

export function pageSpeedTarget(value, strategy = 'mobile') {
  if (!['mobile', 'desktop'].includes(strategy)) throw new PageSpeedError('Choose mobile or desktop.', 400)
  if (typeof value !== 'string' || !value.trim() || value.length > 2048 || /[\\\u0000-\u001f\u007f]/.test(value)) throw new PageSpeedError('Enter a public page URL from The Parlor website.', 400)
  let url
  try { url = new URL(value.trim(), ORIGIN) } catch { throw new PageSpeedError('Enter a valid page URL.', 400) }
  if (!['https:', 'http:'].includes(url.protocol) || !['theparlormagazine.com', 'www.theparlormagazine.com'].includes(url.hostname) || url.username || url.password || url.port) throw new PageSpeedError('Audits are limited to public pages on theparlormagazine.com.', 400)
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : '/'
  const publicPath = PUBLIC_PATHS.has(path) || /^\/post\/[^/]+$/.test(path) ||
    new RegExp(`^/(shop|issue)/${UUID}$`, 'i').test(path) || /^\/borderlands-of-identity\/[a-z0-9-]+$/.test(path)
  if (!publicPath) throw new PageSpeedError('Choose a public article, product, issue, or main website page. Private and checkout pages cannot be audited.', 400)
  // Never transmit campaign parameters, account tokens or fragments to Google.
  return { url: ORIGIN + path, strategy }
}

const plain = value => String(value || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '').slice(0, 1800)
const score = value => typeof value === 'number' && value >= 0 && value <= 1 ? Math.round(value * 100) : null
const finite = value => typeof value === 'number' && Number.isFinite(value)

export function summarizePageSpeed(data, target) {
  const result = data?.lighthouseResult
  if (!result || result.runtimeError || !result.categories || !CATEGORIES.every(id => result.categories[id])) throw new PageSpeedError('Google could not complete all audit categories for this page. Check the page in PageSpeed Insights and try again.')
  const categories = CATEGORIES.map(id => ({ id, title: result.categories[id].title || id, score: score(result.categories[id].score) }))
  const metrics = ['largest-contentful-paint', 'cumulative-layout-shift', 'first-contentful-paint', 'total-blocking-time', 'speed-index'].map(id => {
    const audit = result.audits?.[id]
    return audit ? { id, title: audit.title || id, value: audit.displayValue || 'Unavailable', score: score(audit.score) } : null
  }).filter(Boolean)
  const refs = new Set(CATEGORIES.flatMap(id => (result.categories[id].auditRefs || []).map(ref => ref.id)))
  const findings = [...refs].map(id => {
    const audit = result.audits?.[id]
    if (!audit || ['largest-contentful-paint', 'cumulative-layout-shift', 'first-contentful-paint', 'total-blocking-time', 'speed-index'].includes(id) || ['notApplicable', 'informative', 'manual'].includes(audit.scoreDisplayMode) || !finite(audit.score) || audit.score >= 0.9) return null
    return { id, title: plain(audit.title), description: plain(audit.description), value: plain(audit.displayValue), score: score(audit.score), savingsMs: finite(audit.details?.overallSavingsMs) ? audit.details.overallSavingsMs : 0 }
  }).filter(Boolean).sort((a, b) => b.savingsMs - a.savingsMs || a.score - b.score).slice(0, 12)
  const hasField = experience => experience?.metrics && ['LARGEST_CONTENTFUL_PAINT_MS', 'INTERACTION_TO_NEXT_PAINT', 'CUMULATIVE_LAYOUT_SHIFT_SCORE'].some(id => finite(experience.metrics[id]?.percentile))
  const scope = hasField(data.loadingExperience) ? 'page' : hasField(data.originLoadingExperience) ? 'origin' : null
  const experience = scope === 'page' ? data.loadingExperience : data.originLoadingExperience
  const fields = [
    ['LARGEST_CONTENTFUL_PAINT_MS', 'Largest Contentful Paint (LCP)', 'ms'],
    ['INTERACTION_TO_NEXT_PAINT', 'Interaction to Next Paint (INP)', 'ms'],
    ['CUMULATIVE_LAYOUT_SHIFT_SCORE', 'Cumulative Layout Shift (CLS)', 'score'],
  ].map(([id, title, unit]) => {
    const metric = experience?.metrics?.[id]
    if (!finite(metric?.percentile)) return null
    return { id, title, value: unit === 'score' ? (metric.percentile / 100).toFixed(2) : `${Math.round(metric.percentile).toLocaleString('en-US')} ms`, rating: metric.category || null }
  }).filter(Boolean)
  return { url: target.url, strategy: target.strategy,
    auditedAt: Number.isFinite(Date.parse(result.fetchTime)) ? new Date(result.fetchTime).toISOString() : new Date().toISOString(),
    categories, metrics, findings, fieldData: scope ? { scope, metrics: fields } : null,
    reportUrl: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(target.url)}&form_factor=${target.strategy}` }
}

export async function runPageSpeed(url, strategy) {
  const target = pageSpeedTarget(url, strategy)
  const key = process.env.GOOGLE_PAGESPEED_API_KEY
  if (!key) throw new PageSpeedError('Add GOOGLE_PAGESPEED_API_KEY to the server environment to enable audits.', 503)
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  endpoint.searchParams.set('url', target.url)
  endpoint.searchParams.set('strategy', target.strategy)
  endpoint.searchParams.set('locale', 'en')
  for (const category of CATEGORIES) endpoint.searchParams.append('category', category)
  let response
  try {
    response = await fetch(endpoint, { headers: { 'X-Goog-Api-Key': key }, signal: AbortSignal.timeout(45000), cache: 'no-store', redirect: 'error' })
  } catch (error) {
    if (['TimeoutError', 'AbortError'].includes(error.name)) throw new PageSpeedError('The audit took too long. Try again later or open PageSpeed Insights directly.', 504)
    throw new PageSpeedError('PageSpeed Insights could not be reached. Try again later.')
  }
  if (response.status === 429) throw new PageSpeedError('Google’s audit quota is temporarily exhausted. Try again later.', 429)
  if ([400, 401, 403].includes(response.status)) throw new PageSpeedError('Google rejected the audit request. Check the server API key, API restrictions and that PageSpeed Insights API is enabled.', 503)
  if (!response.ok) throw new PageSpeedError('Google could not run this audit. Try again later.')
  let data
  try { data = await response.json() } catch { throw new PageSpeedError('Google returned an unreadable audit result. Try again later.') }
  return summarizePageSpeed(data, target)
}
