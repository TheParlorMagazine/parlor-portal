import { serviceClient } from '../../../../lib/apiAuth'

// GET → active bundles with their items, for the storefront
export async function GET() {
  const db = serviceClient()
  const { data, error } = await db.from('shop_bundles')
    .select('*, shop_bundle_items(id, variant_id, quantity, sort, shop_products(id, name, price, price_eur, price_gbp, images, print_provider_id, fulfillment, printify_product_id, printify_variant_id, variants))')
    .eq('active', true)
    .order('sort', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ bundles: data || [] })
}
