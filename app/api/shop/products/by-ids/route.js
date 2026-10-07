import { serviceClient } from '../../../../../lib/apiAuth'

// POST { ids: string[] } → fetch specific products by ID regardless of active status.
// Used by bundle PDPs to show the included items even if they're not on the storefront.
export async function POST(req) {
  const { ids } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || !ids.length) return Response.json({ products: [] })
  const db = serviceClient()
  const { data, error } = await db.from('shop_products')
    .select('id, name, variant, description, images, price, price_eur, price_gbp, fulfillment, variants, printify_variant_id')
    .in('id', ids)
  if (error) return Response.json({ products: [] })
  return Response.json({ products: data || [] })
}
