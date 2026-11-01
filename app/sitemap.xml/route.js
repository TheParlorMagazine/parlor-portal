import { serviceClient } from '../../lib/apiAuth'
import { siteSitemap } from '../../lib/siteSitemap'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return new Response(await siteSitemap(serviceClient()), { headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch {
    // Never publish an empty/partial sitemap as success during a database outage.
    return new Response('Sitemap temporarily unavailable. Please retry.', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    })
  }
}
