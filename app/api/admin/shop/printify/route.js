import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { printifyConfigured, resolveShopId, listProducts, mapPrintifyProduct } from '../../../../../lib/printify'

const ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

// GET → preview the Printify catalogue available to import.
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  if (!printifyConfigured()) return Response.json({ configured: false, products: [] })
  try {
    const shopId = await resolveShopId()
    if (!shopId) return Response.json({ configured: true, error: 'No Printify shop found on this account', products: [] })
    const raw = await listProducts(shopId)
    // Which of these are already in our catalogue?
    const ids = raw.map(p => String(p.id))
    const { data: existing } = await g.db.from('shop_products').select('printify_product_id').in('printify_product_id', ids.length ? ids : ['__none__'])
    const have = new Set((existing || []).map(r => r.printify_product_id))
    const products = raw.map(p => ({
      printify_product_id: String(p.id),
      title: p.title,
      image: (p.images || []).find(i => i.is_default)?.src || p.images?.[0]?.src || null,
      variants: (p.variants || []).filter(v => v.is_enabled).length,
      imported: have.has(String(p.id)),
    }))
    return Response.json({ configured: true, shopId, products })
  } catch (e) {
    return Response.json({ configured: true, error: e.message, products: [] }, { status: 200 })
  }
}

// POST { ids?: string[] } → import (or re-sync) those Printify products; omit ids to import all.
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  if (!printifyConfigured()) return Response.json({ error: 'PRINTIFY_API_TOKEN is not set' }, { status: 400 })
  let body = {}; try { body = await request.json() } catch {}
  try {
    const shopId = await resolveShopId()
    if (!shopId) return Response.json({ error: 'No Printify shop found' }, { status: 400 })
    let raw = await listProducts(shopId)
    if (Array.isArray(body.ids) && body.ids.length) {
      const want = new Set(body.ids.map(String))
      raw = raw.filter(p => want.has(String(p.id)))
    }
    let created = 0, updated = 0
    for (const p of raw) {
      const mapped = mapPrintifyProduct(p, shopId)
      const { data: found } = await g.db.from('shop_products').select('id').eq('printify_product_id', mapped.printify_product_id).maybeSingle()
      if (found) {
        // Re-sync Printify-owned fields only; leave category/featured/sort/active as the admin set them.
        const { name, description, images, price, variants, printify_variant_id, printify_data, printify_shop_id } = mapped
        await g.db.from('shop_products').update({ name, description, images, price, variants, printify_variant_id, printify_data, printify_shop_id }).eq('id', found.id)
        updated++
      } else {
        // New imports start inactive so an admin can set a category and review before publishing.
        await g.db.from('shop_products').insert({ ...mapped, active: false })
        created++
      }
    }
    return Response.json({ ok: true, created, updated, total: raw.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
