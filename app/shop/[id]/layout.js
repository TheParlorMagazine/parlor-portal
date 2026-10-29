import { headers } from 'next/headers'
import { serviceClient } from '../../../lib/apiAuth'
import { countryFromRequest, currencyForRequest } from '../../../lib/geo'
import { SHOPPING_PRODUCT_FIELDS, SHOP_PRODUCT_ID, productStructuredData } from '../../../lib/googleShopping'

export const dynamic = 'force-dynamic'

export default async function ProductLayout({ children, params }) {
  const { id } = await params
  let schema = null
  if (SHOP_PRODUCT_ID.test(id)) {
    try {
      const request = { headers: await headers() }
      const { data, error } = await serviceClient().from('shop_products').select(SHOPPING_PRODUCT_FIELDS)
        .eq('id', id).eq('active', true).maybeSingle()
      if (!error) schema = productStructuredData(data, {
        currency: currencyForRequest(request).toUpperCase(), country: countryFromRequest(request) || 'US',
      })
    } catch { /* Keep the existing storefront usable if structured data is unavailable. */ }
  }
  return <>
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />}
    {children}
  </>
}
