import { serviceClient } from '../../../../lib/apiAuth'

// GET → category names to show in the storefront nav, in order. A category
// appears once it has at least one active product.
export async function GET() {
  const db = serviceClient()
  const { data: active } = await db.from('shop_products').select('category').eq('active', true)
  const used = new Set((active || []).map(r => r.category).filter(Boolean))

  // Order by the managed category list when available; otherwise alphabetical.
  const { data: cats } = await db.from('shop_categories').select('name, sort').order('sort', { ascending: true }).order('name', { ascending: true })
  let names
  if (cats && cats.length) names = cats.map(c => c.name).filter(n => used.has(n))
  else names = [...used].sort()

  return Response.json({ categories: names })
}
