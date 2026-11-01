import { createSign } from 'node:crypto'

const definitions = {
  search: ['Search Console', ['GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON', 'GOOGLE_SEARCH_CONSOLE_SITE']],
  ga4: ['Google Analytics 4', ['GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON', 'GOOGLE_ANALYTICS_PROPERTY_ID']],
  merchant: ['Merchant Center', ['GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON', 'GOOGLE_MERCHANT_ACCOUNT_ID']],
  googleAds: ['Google Ads', ['GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON', 'GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_API_VERSION']],
  instagram: ['Instagram / Meta', ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID', 'META_GRAPH_API_VERSION']],
  pinterest: ['Pinterest Ads', ['PINTEREST_ACCESS_TOKEN', 'PINTEREST_AD_ACCOUNT_ID']],
  reddit: ['Reddit Ads', ['REDDIT_ACCESS_TOKEN', 'REDDIT_AD_ACCOUNT_ID']],
}
export class ReportingError extends Error { constructor(message, status = 502) { super(message); this.status = status } }
export function connections() {
  return Object.entries(definitions).map(([id, [name, keys]]) => ({ id, name, configured: keys.every(key => Boolean(process.env[key])), missing: keys.filter(key => !process.env[key]), note: 'Server credentials must have read access to this account. Configuration is verified when a report loads.' }))
}
export function reportPeriod(start, end) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  if (!valid(start) || !valid(end) || start > end || (Date.parse(end) - Date.parse(start)) / 86400000 > 366 || end > new Date().toISOString().slice(0, 10)) throw new ReportingError('Choose valid dates, up to one year, ending today or earlier.', 400)
  return { start, end }
}
async function request(url, token, body, headers = {}) {
  let response
  try { response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000), redirect: 'error', cache: 'no-store' }) } catch (error) {
    if (['TimeoutError', 'AbortError'].includes(error.name)) throw new ReportingError('The reporting provider took too long. Try again later.', 504)
    throw new ReportingError('The reporting provider could not be reached. Try again later.')
  }
  if (!response.ok) throw new ReportingError(response.status === 429 ? 'Provider quota reached. Try again later.' : response.status === 401 || response.status === 403 ? 'The provider denied access. Check credentials, API approval, and account permissions.' : 'The provider rejected the report. Check account settings and API version.', response.status === 429 ? 429 : 502)
  return response.json()
}
async function googleToken(scope) {
  let account
  try { account = JSON.parse(process.env.GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON); if (!account.client_email || !account.private_key) throw Error() } catch { throw new ReportingError('The Google service account configuration is invalid.', 503) }
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: account.client_email, scope: `https://www.googleapis.com/auth/${scope}`, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`
  let assertion
  try { assertion = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url')}` } catch { throw new ReportingError('The Google private key is invalid.', 503) }
  let response
  try { response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store' }) } catch { throw new ReportingError('Google authentication is temporarily unavailable.') }
  const data = await response.json()
  if (!response.ok || !data.access_token) throw new ReportingError('Google authentication failed. Check the service account and clock.', 503)
  return data.access_token
}
const numericId = (value, hyphens = false) => {
  const id = hyphens ? String(value || '').replace(/-/g, '') : String(value || '')
  if (!/^\d+$/.test(id)) throw new ReportingError('Use a numeric reporting account ID.', 503)
  return id
}
export async function loadReport(source, start, end) {
  reportPeriod(start, end)
  const connection = connections().find(item => item.id === source)
  if (!connection) throw new ReportingError('Unknown reporting source.', 400)
  if (!connection.configured) throw new ReportingError(`Configure ${connection.missing.join(', ')} on the server.`, 503)
  let columns = [], rows = [], note = '', currency = ''
  if (source === 'search') {
    const token = await googleToken('webmasters.readonly')
    const data = await request(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(process.env.GOOGLE_SEARCH_CONSOLE_SITE)}/searchAnalytics/query`, token, { startDate: start, endDate: end, dimensions: ['page'], rowLimit: 1000 })
    columns = ['Page', 'Clicks', 'Impressions', 'CTR', 'Average position']
    rows = (data.rows || []).map(row => [row.keys?.[0], row.clicks, row.impressions, row.ctr, row.position])
    note = 'Top 1,000 pages. Search Console data can lag several days; CTR is a fraction. These rows are not a site-wide total.'
  } else if (source === 'ga4') {
    const token = await googleToken('analytics.readonly')
    const data = await request(`https://analyticsdata.googleapis.com/v1beta/properties/${numericId(process.env.GOOGLE_ANALYTICS_PROPERTY_ID)}:runReport`, token, { dateRanges: [{ startDate: start, endDate: end }], dimensions: [{ name: 'sessionSourceMedium' }], metrics: ['sessions', 'activeUsers', 'engagedSessions', 'keyEvents'].map(name => ({ name })), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 1000 })
    columns = ['Source / medium', 'Sessions', 'Active users', 'Engaged sessions', 'Key events']
    rows = (data.rows || []).map(row => [row.dimensionValues?.[0]?.value, ...(row.metricValues || []).map(item => item.value)])
    note = 'Top 1,000 traffic sources. Users can appear in multiple rows. GA4 collection and consent must be configured separately.'
  } else if (source === 'merchant') {
    const token = await googleToken('content')
    const data = await request(`https://merchantapi.googleapis.com/reports/v1/accounts/${numericId(process.env.GOOGLE_MERCHANT_ACCOUNT_ID)}/reports:search`, token, { query: `SELECT date, clicks, impressions, click_through_rate FROM product_performance_view WHERE date BETWEEN '${start}' AND '${end}' AND marketing_method = 'ORGANIC'`, pageSize: 1000 })
    columns = ['Date', 'Free-listing clicks', 'Impressions', 'CTR']
    rows = (data.results || []).map(({ productPerformanceView: r }) => [`${r.date?.year}-${String(r.date?.month).padStart(2, '0')}-${String(r.date?.day).padStart(2, '0')}`, r.clicks, r.impressions, r.clickThroughRate])
    note = 'Organic product performance only. Requires Merchant reporting eligibility; product diagnostics are not included.'
    if (data.nextPageToken) note += ' Additional rows are available in Merchant Center.'
  } else if (source === 'googleAds') {
    const version = process.env.GOOGLE_ADS_API_VERSION
    if (!/^v\d+$/.test(version)) throw new ReportingError('Configure a supported Google Ads API version.', 503)
    const token = await googleToken('adwords')
    const headers = { 'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN }
    if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = numericId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID, true)
    const data = await request(`https://googleads.googleapis.com/${version}/customers/${numericId(process.env.GOOGLE_ADS_CUSTOMER_ID, true)}/googleAds:search`, token, { query: `SELECT campaign.name, customer.currency_code, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${start}' AND '${end}' LIMIT 1000` }, headers)
    columns = ['Campaign', 'Currency', 'Impressions', 'Clicks', 'Spend', 'Conversions', 'Conversion value']
    rows = (data.results || []).map(r => [r.campaign?.name, r.customer?.currencyCode, r.metrics?.impressions, r.metrics?.clicks, r.metrics?.costMicros == null ? null : Number(r.metrics.costMicros) / 1e6, r.metrics?.conversions, r.metrics?.conversionsValue])
    note = 'Up to 1,000 campaigns. Google attribution settings apply.'
    if (data.nextPageToken) note += ' More campaigns are available in Google Ads.'
  } else if (source === 'instagram') {
    const version = process.env.META_GRAPH_API_VERSION
    if (!/^v\d+\.\d+$/.test(version)) throw new ReportingError('Configure a supported Meta Graph API version.', 503)
    const params = new URLSearchParams({ fields: 'campaign_name,impressions,clicks,spend,account_currency', level: 'campaign', breakdowns: 'publisher_platform', time_range: JSON.stringify({ since: start, until: end }), limit: '1000' })
    const data = await request(`https://graph.facebook.com/${version}/act_${numericId(process.env.META_AD_ACCOUNT_ID)}/insights?${params}`, process.env.META_ACCESS_TOKEN)
    columns = ['Campaign', 'Currency', 'Impressions', 'Clicks', 'Spend']
    rows = (data.data || []).filter(r => r.publisher_platform === 'instagram').map(r => [r.campaign_name, r.account_currency, r.impressions, r.clicks, r.spend])
    note = 'Instagram placements only, up to 1,000 Meta rows. Clicks include all click types. Conversion attribution is not included.'
    if (data.paging?.next) note += ' More rows are available in Ads Manager.'
  } else if (source === 'reddit') {
    if ((Date.parse(end) - Date.parse(start)) / 86400000 >= 31) throw new ReportingError('Reddit reports support up to 31 days per request. Choose a shorter period.', 400)
    const id = process.env.REDDIT_AD_ACCOUNT_ID
    if (!/^[a-zA-Z0-9_]+$/.test(id)) throw new ReportingError('The Reddit advertising account ID is invalid.', 503)
    const token = process.env.REDDIT_ACCESS_TOKEN
    const headers = { 'User-Agent': process.env.REDDIT_USER_AGENT || 'web:theparlormagazine-reporting:v1' }
    const base = `https://ads-api.reddit.com/api/v3/ad_accounts/${id}`
    const account = await request(base, token, undefined, headers)
    currency = account.data?.currency || ''
    const stop = Math.min(Date.parse(end) + 86400000, Math.floor(Date.now() / 3600000) * 3600000)
    const windows = []
    for (let cursor = Date.parse(start); cursor < stop; cursor += 3 * 86400000) {
      windows.push({ starts_at: new Date(cursor).toISOString(), ends_at: new Date(Math.min(cursor + 3 * 86400000, stop)).toISOString() })
    }
    const pages = await Promise.all(windows.map(window => request(`${base}/reports`, token, { data: { ...window, fields: ['IMPRESSIONS', 'CLICKS', 'SPEND'], breakdowns: ['campaign_id', 'date'], time_zone_id: 'GMT' } }, headers)))
    columns = ['Campaign ID', 'Date (UTC)', 'Currency', 'Impressions', 'Clicks', 'Spend']
    rows = pages.flatMap(page => (page.data?.metrics || []).map(r => [r.campaign_id, r.date?.slice(0, 10), currency || 'Not returned', r.impressions, r.clicks, r.spend == null ? null : Number(r.spend) / 1e6]))
    note = 'Daily campaign rows in UTC, up to 31 days. Current-day data ends at the last complete hour. Reddit spend micro-units are converted to account currency; conversions are not included.'
    if (pages.some(page => page.pagination?.next_url)) note += ' Provider pagination limited this report; additional rows are available in Reddit Ads. Do not treat this as a complete total.'
  } else if (source === 'pinterest') {
    const accountId = numericId(process.env.PINTEREST_AD_ACCOUNT_ID)
    const token = process.env.PINTEREST_ACCESS_TOKEN
    const account = await request(`https://api.pinterest.com/v5/ad_accounts/${accountId}`, token)
    const campaigns = await request(`https://api.pinterest.com/v5/ad_accounts/${accountId}/campaigns?page_size=250`, token)
    const items = campaigns.items || []
    columns = ['Campaign', 'Currency', 'Spend', 'Impressions', 'Clickthroughs']
    currency = account.currency || ''
    if (items.length) {
      const params = new URLSearchParams({ start_date: start, end_date: end, campaign_ids: items.map(item => numericId(item.id)).join(','), columns: 'CAMPAIGN_ID,SPEND_IN_DOLLAR,TOTAL_IMPRESSION,TOTAL_CLICKTHROUGH', granularity: 'TOTAL' })
      const data = await request(`https://api.pinterest.com/v5/ad_accounts/${accountId}/campaigns/analytics?${params}`, token)
      const names = Object.fromEntries(items.map(item => [item.id, item.name]))
      rows = data.map(r => [names[r.CAMPAIGN_ID] || r.CAMPAIGN_ID, currency || 'Not returned', r.SPEND_IN_DOLLAR, r.TOTAL_IMPRESSION, r.TOTAL_CLICKTHROUGH])
    }
    note = 'Up to 250 campaigns. Pinterest date-history restrictions apply; spend uses the API’s SPEND_IN_DOLLAR metric. Conversion attribution is not included.'
    if (campaigns.bookmark) note += ' More campaigns are available in Pinterest Ads.'

  }
  return { source, name: connection.name, start, end, fetchedAt: new Date().toISOString(), columns, rows, note, currency }
}
