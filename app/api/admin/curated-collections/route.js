import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

async function auth(request) {
  const user = await requireUser(request)
  if (!user) return { err: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { err: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db }
}

// GET — all collections with nested houses and treats
export async function GET(request) {
  const { err, db } = await auth(request)
  if (err) return err

  // Fetch in separate queries to avoid schema-cache issues with nested FK selects
  const { data: cols, error: colErr } = await db
    .from('tot_collections').select('id, name, description, live, sort_order, price, price_eur, price_gbp, ship_line').order('sort_order')
  if (colErr) return Response.json({ error: colErr.message }, { status: 500 })
  if (!cols?.length) return Response.json({ collections: [] })

  const colIds = cols.map(c => c.id)
  const { data: houses, error: hErr } = await db
    .from('tot_houses').select('*').in('collection_id', colIds).order('sort_order')
  if (hErr) return Response.json({ error: hErr.message }, { status: 500 })

  const houseIds = (houses || []).map(h => h.id)
  let treats = []
  if (houseIds.length) {
    // Try with product join; fall back without if migration not yet run
    const tRes = await db.from('tot_treats')
      .select('*, shop_products(id, name, images, inventory)')
      .in('house_id', houseIds).order('sort_order')
    if (tRes.error) {
      const tFallback = await db.from('tot_treats').select('*').in('house_id', houseIds).order('sort_order')
      if (tFallback.error) return Response.json({ error: tFallback.error.message }, { status: 500 })
      treats = tFallback.data || []
    } else {
      treats = tRes.data || []
    }
  }

  // Assemble nested structure
  const treatsByHouse = {}
  for (const t of treats) {
    if (!treatsByHouse[t.house_id]) treatsByHouse[t.house_id] = []
    treatsByHouse[t.house_id].push(t)
  }
  const housesByCol = {}
  for (const h of houses || []) {
    if (!housesByCol[h.collection_id]) housesByCol[h.collection_id] = []
    housesByCol[h.collection_id].push({ ...h, treats: treatsByHouse[h.id] || [] })
  }
  const collections = cols.map(c => ({ ...c, houses: housesByCol[c.id] || [] }))

  return Response.json({ collections })
}

// POST — create a collection
export async function POST(request) {
  const { err, db } = await auth(request)
  if (err) return err

  const body = await request.json().catch(() => ({}))
  const { data, error } = await db.from('tot_collections').insert({
    name: (body.name || '').trim(),
    description: (body.description || '').trim() || null,
    live: body.live ?? false,
    sort_order: body.sort_order ?? 0,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ collection: data })
}
