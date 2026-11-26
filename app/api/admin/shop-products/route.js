import {shopSaleAmount} from '../../../../lib/shopSale'
import { packageSize } from '../../../../lib/shopPackaging'
import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

const STRINGS = ['name', 'variant', 'description', 'category', 'tint', 'sku', 'fulfillment', 'external_url', 'stripe_price_id', 'printify_shop_id', 'printify_product_id', 'featured_blurb', 'ships_to', 'packaging_size']
const NUMBERS = ['price', 'price_eur', 'price_gbp', 'sort', 'inventory', 'printify_variant_id', 'weight_oz', 'sale_discount_percent']
const BOOLS = ['active', 'featured']

function pick(b) {
  const out = {}
  for (const f of STRINGS) if (f in b) out[f] = b[f] === '' ? null : b[f]
  for (const f of NUMBERS) if (f in b) out[f] = (b[f] === '' || b[f] == null) ? null : Number(b[f])
  for (const f of BOOLS) if (f in b) out[f] = !!b[f]
  if ('images' in b) out.images = Array.isArray(b.images) ? b.images.filter(Boolean) : []
  if ('variants' in b) out.variants = b.variants ?? null
  if ('printify_data' in b) out.printify_data = b.printify_data ?? null
  if ('bundle_config' in b) out.bundle_config = b.bundle_config ?? null
  // price is NOT NULL — default to 0 rather than null
  if ('price' in out && out.price == null) out.price = 0
  if ('fulfillment' in out && !out.fulfillment) out.fulfillment = 'manual'
  return out
}


function saleError(body){
 if(!('sale_discount_percent' in body))return null
 const n=Number(body.sale_discount_percent || 0)
 if(!Number.isInteger(n)||n<0||n>99)return 'Choose a whole sale percentage from 0 to 99.'
 const amounts=[body.price,body.price_eur,body.price_gbp,...(Array.isArray(body.variants)?body.variants.map(v=>v.price):[])].filter(value=>value!=null&&value!=='')
 if(n&&amounts.some(value=>!Number.isFinite(Number(value))||shopSaleAmount(value,n)<.01))return 'Sale prices must be at least 0.01. Reduce the discount or increase the regular price.'
 if(n&&body.fulfillment==='external')return 'Sales are managed by the external shop for this product.'
 return null
}
async function writeProduct(db,patch,id){
 const write=value=>id?db.from('shop_products').update(value).eq('id',id).select().single():db.from('shop_products').insert(value).select().single()
 let result=await write(patch)
 if(result.error&&['42703','PGRST204'].includes(result.error.code)&&/sale_discount_percent/.test(result.error.message || '')){
  if(patch.sale_discount_percent>0)return {error:{message:'Apply the shop product sales migration before saving a sale.'}}
  const {sale_discount_percent,...legacy}=patch;result=await write(legacy)
 }
 return result
}

// GET → all products (admin view, includes inactive), newest sort first
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { data, error } = await g.db.from('shop_products').select('*')
    .order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ products: data || [] })
}

// POST { ...fields } → create
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (b.packaging_size != null && b.packaging_size !== '' && !packageSize(b.packaging_size)) return Response.json({ error: 'Invalid packaging size' }, { status: 400 })
  const invalidSale=saleError(b);if(invalidSale)return Response.json({error:invalidSale},{status:400})
  const patch = pick(b)
  if (!patch.name) return Response.json({ error: 'name required' }, { status: 400 })
  const { data, error } = await writeProduct(g.db,patch)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (patch.featured === true) await clearOtherFeatured(g.db, data.id)
  return Response.json({ product: data })
}

// Only one product is featured on the storefront hero at a time. When a product
// is set featured, clear the flag on every other product.
async function clearOtherFeatured(db, keepId) {
  await db.from('shop_products').update({ featured: false }).eq('featured', true).neq('id', keepId)
}

// PATCH { id, ...fields } → update
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  if (b.packaging_size != null && b.packaging_size !== '' && !packageSize(b.packaging_size)) return Response.json({ error: 'Invalid packaging size' }, { status: 400 })
  const invalidSale=saleError(b);if(invalidSale)return Response.json({error:invalidSale},{status:400})
  const patch = pick(b)
  const { data, error } = await writeProduct(g.db,patch,b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (patch.featured === true) await clearOtherFeatured(g.db, b.id)
  return Response.json({ product: data })
}

// DELETE { id } → remove
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { error } = await g.db.from('shop_products').delete().eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
