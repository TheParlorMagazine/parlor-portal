import { queryShopSale } from '../../../../lib/shopSale'
import { publicShopProduct } from '../../../../lib/shopProductImages'
import { serviceClient } from '../../../../lib/apiAuth'

const SALE_FIELDS = 'product_type, public_listing, id, name, variant, description, category, price, price_eur, price_gbp, images, tint, featured, featured_blurb, sort, inventory, fulfillment, external_url, variants, printify_variant_id, printify_product_id, sku, print_provider_id, ships_to, weight_oz, bundle_config'

// GET → active shop products for the public storefront (/shop), in sort order.
export async function GET() {
  const db = serviceClient()
  const { data, error } = await queryShopSale(SALE_FIELDS, fields => db.from('shop_products')
    .select(fields)
    .eq('active', true).eq('public_listing', true)
    .order('sort', { ascending: true }).order('created_at', { ascending: false }))
  if (error) return Response.json({ products: [] })
  return Response.json({ products: (data || []).filter(p => p.product_type !== 'film_screening_ticket' || p.public_listing).map(publicShopProduct) })
}
