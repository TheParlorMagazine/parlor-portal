import { serviceClient } from '../../../../lib/apiAuth'
import { googleShoppingFeed, loadShoppingProducts } from '../../../../lib/googleShopping'

export const dynamic = 'force-dynamic'

// Public read-only feed; no member data, provider credentials or database writes.
export async function GET() {
  try {
    const products = await loadShoppingProducts(serviceClient())
    return new Response(googleShoppingFeed(products), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=300', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch {
    // A temporary outage must not tell Merchant Center the entire shop vanished.
    return new Response('Product feed temporarily unavailable. Please retry.', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    })
  }
}
