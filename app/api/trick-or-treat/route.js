import { serviceClient } from '../../../lib/apiAuth'

// Public endpoint — returns the first live collection's active houses + treats + standalone products
export async function GET() {
  try {
    const db = serviceClient()

    // 1. Find the first live collection
    const { data: cols } = await db
      .from('tot_collections')
      .select('id, name, description, price, price_eur, price_gbp, ship_line')
      .eq('live', true)
      .order('sort_order')
      .limit(1)

    const collection = cols?.[0]
    if (!collection) return Response.json({ houses: [], collection: null })

    // 2. Houses for that collection
    const { data: houses } = await db
      .from('tot_houses')
      .select('id, name, description, sort_order, active')
      .eq('collection_id', collection.id)
      .order('sort_order')

    const activeHouses = (houses || []).filter(h => h.active)
    const houseIds = activeHouses.map(h => h.id)

    // 3. Treats + their linked shop_product images
    let treats = []
    if (houseIds.length) {
      const { data: tRes } = await db
        .from('tot_treats')
        .select('id, house_id, name, note, stock, share_img, sort_order, active, product_id, shop_products(id, name, images, inventory)')
        .in('house_id', houseIds)
        .order('sort_order')
      treats = (tRes || []).filter(t => t.active)
    }

    // 4. Standalone products for this collection
    const { data: standaloneRows } = await db
      .from('tot_collection_products')
      .select('id, sort_order, product_id, shop_products(id, name, images)')
      .eq('collection_id', collection.id)
      .order('sort_order')

    // Assemble nested structure
    const treatsByHouse = {}
    for (const t of treats) {
      if (!treatsByHouse[t.house_id]) treatsByHouse[t.house_id] = []
      treatsByHouse[t.house_id].push({
        id: t.id,
        name: t.name,
        note: t.note || '',
        stock: t.stock ?? 0,
        share_img: t.share_img || '',
        product_id: t.product_id,
        product_image: t.shop_products?.images?.[0] || null,
        product_name: t.shop_products?.name || null,
      })
    }

    const mappedHouses = activeHouses.map(h => ({
      id: h.id,
      name: h.name,
      description: h.description || '',
      treats: treatsByHouse[h.id] || [],
    }))

    const standalone = (standaloneRows || []).map(r => ({
      id: r.id,
      product_id: r.product_id,
      name: r.shop_products?.name || '',
      image: r.shop_products?.images?.[0] || null,
    }))

    return Response.json({ houses: mappedHouses, collection, standalone }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    })
  } catch (e) {
    console.error('trick-or-treat GET error:', e)
    return Response.json({ houses: [], collection: null })
  }
}
