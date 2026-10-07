import { serviceClient } from '../../../../lib/apiAuth'

// GET → active shop products for the public storefront (/shop), in sort order.
export async function GET() {
  const db = serviceClient()
  const { data, error } = await db.from('shop_products')
    .select('id, name, variant, description, category, price, price_eur, price_gbp, images, tint, featured, featured_blurb, sort, inventory, fulfillment, external_url, variants, printify_variant_id, printify_product_id, sku, print_provider_id, ships_to, weight_oz, bundle_config')
    .eq('active', true)
    .order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ products: [] })
  return Response.json({ products: data || [] })
}
