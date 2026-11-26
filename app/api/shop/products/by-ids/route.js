import { publicShopProduct } from '../../../../../lib/shopProductImages'
import { queryShopSale } from '../../../../../lib/shopSale'
import { serviceClient } from '../../../../../lib/apiAuth'

const SALE_FIELDS = 'product_type, public_listing, id, name, variant, description, images, price, price_eur, price_gbp, fulfillment, variants, printify_variant_id'

// POST { ids: string[] } → fetch specific products by ID regardless of active status.
// Used by bundle PDPs to show the included items even if they're not on the storefront.
export async function POST(req) {
  const { ids } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || !ids.length) return Response.json({ products: [] })
  const db = serviceClient()
  const { data, error } = await queryShopSale(SALE_FIELDS, fields => db.from('shop_products')
    .select(fields)
    .eq('public_listing', true).in('id', ids))
  if (error) return Response.json({ products: [] })
  return Response.json({ products: (data || []).filter(p => p.product_type !== 'film_screening_ticket' || p.public_listing).map(publicShopProduct) })
}
