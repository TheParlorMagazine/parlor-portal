import { serviceClient } from './apiAuth'

// Match the homepage's latest issue discovery, using only published articles.
export async function latestAboutIssueHref() {
  try {
    const { data, error } = await serviceClient().from('articles').select('issue_id')
      .eq('published', true).not('issue_id', 'is', null)
      .or('media_type.is.null,media_type.neq.member_post')
      .lte('date_published', new Date().toISOString())
      .order('date_published', { ascending: false }).limit(1)
      .abortSignal(AbortSignal.timeout(3000))
    if (!error && data?.[0]?.issue_id != null) return `/issue/${encodeURIComponent(String(data[0].issue_id))}`
  } catch { /* The public print issue remains available if issue discovery is unavailable. */ }
  return '/print'
}
