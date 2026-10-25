import { createReservedCheckout } from '../../../../lib/checkoutReservations'
import { encodeShopSnapshot, snapshotShopProduct } from '../../../../lib/shopSnapshot'
import { requireShopUser } from '../../../../lib/shopAuth'
import { ensureStripeCustomer } from '../../../../lib/stripeCustomer'
import Stripe from 'stripe'
import { serviceClient } from '../../../../lib/apiAuth'
import { currencyForRequest, priceForCurrency } from '../../../../lib/geo'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const user = await requireShopUser(request)
  if (!user) return Response.json({ error: 'Sign in or create an account before checkout.' }, { status: 401 })
  if (!user.email_confirmed_at) return Response.json({error:'Verify your email before purchasing.'},{status:403})
  let body = {}; try { body = await request.json() } catch {}
  const { treatIds, collectionId, successUrl, cancelUrl, requestId } = body

  if (!Array.isArray(treatIds) || !treatIds.length || !collectionId || !successUrl || !cancelUrl) {
    return Response.json({ error: 'treatIds, collectionId, successUrl and cancelUrl are required' }, { status: 400 })
  }

  const db = serviceClient()
  const origin = new URL(request.url).origin
  let cancel
  try { cancel = new URL(cancelUrl, origin) } catch { return Response.json({ error: 'Invalid return URL' }, { status: 400 }) }
  if (cancel.origin !== origin) return Response.json({ error: 'Checkout must return to this site.' }, { status: 400 })
  if (treatIds.length > 20 || new Set(treatIds).size !== treatIds.length) return Response.json({ error: 'Choose one different treat from each house.' }, { status: 400 })

  // 1. Load collection (for price + name)
  const { data: collection, error: colErr } = await db
    .from('tot_collections')
    .select('id, name, price, price_eur, price_gbp, ship_line')
    .eq('id', collectionId)
    .eq('live', true)
    .single()
  if (colErr || !collection) return Response.json({ error: 'Collection not found or not live' }, { status: 404 })
  if (!collection.price) return Response.json({ error: 'Bundle price not set on this collection' }, { status: 400 })

  // 2. Validate selected treats — they must exist, be active, and have stock
  const { data: treats, error: tErr } = await db
    .from('tot_treats')
    .select('id, name, stock, house_id, product_id, shop_products(*)')
    .in('id', treatIds)
    .eq('active', true)
  if (tErr) return Response.json({ error: tErr.message }, { status: 500 })

  const foundIds = new Set((treats || []).map(t => t.id))
  const missing = treatIds.filter(id => !foundIds.has(id))
  if (missing.length) return Response.json({ error: `Treats not found or inactive: ${missing.join(', ')}` }, { status: 400 })

  const soldOut = (treats || []).filter(t => (t.stock ?? 0) <= 0)
  if (soldOut.length) {
    return Response.json({ error: `Sold out: ${soldOut.map(t => t.name).join(', ')}` }, { status: 400 })
  }

  const { data: houses, error: houseError } = await db.from('tot_houses').select('id').eq('collection_id', collectionId).eq('active', true)
  const houseIds = new Set((houses || []).map(h => h.id))
  if (houseError || !houseIds.size || treats.length !== houseIds.size || new Set(treats.map(t => t.house_id)).size !== houseIds.size || treats.some(t => !houseIds.has(t.house_id))) return Response.json({ error: 'Choose exactly one treat from each house in this collection.' }, { status: 400 })

  // 3. Load standalone products (always-included items like the tote)
  const { data: standaloneRows, error: standaloneError } = await db
    .from('tot_collection_products')
    .select('product_id, shop_products(*)')
    .eq('collection_id', collectionId)
    .order('sort_order')

  if (standaloneError) return Response.json({ error: 'Included products could not be loaded.' }, { status: 500 })
  const standalone = (standaloneRows || []).filter(r => r.product_id)

  // 4. Build the Stripe line item — one flat bundle price
  const currency = currencyForRequest(request)
  const bundlePrice = { price: collection.price, price_eur: collection.price_eur, price_gbp: collection.price_gbp }
  const amount = Math.round(priceForCurrency(bundlePrice, currency) * 100)
  if (!Number.isSafeInteger(amount) || amount<=0) return Response.json({ error: 'Bundle price not configured for this currency' }, { status: 400 })

  const treatNames = (treats || []).map(t => t.shop_products?.name || t.name).join(', ')
  const standaloneNames = standalone.map(r => r.shop_products?.name || '').filter(Boolean).join(', ')
  const description = [standaloneNames, treatNames].filter(Boolean).join(' · ')

  // First treat's product image as the Stripe thumbnail (or standalone image)
  const firstImage = standalone[0]?.shop_products?.images?.[0]
    || treats?.[0]?.shop_products?.images?.[0]

  let allowedCountries = ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'FR', 'DE', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT', 'CH', 'PT', 'MX', 'BR', 'JP']
  for (const product of [...treats.map(t => t.shop_products), ...standalone.map(r => r.shop_products)].filter(Boolean)) {
    if (product.ships_to === 'us_only') allowedCountries = allowedCountries.filter(c => c === 'US')
    else if (Array.isArray(product.ships_to) && product.ships_to.length) allowedCountries = allowedCountries.filter(c => product.ships_to.includes(c))
  }
  if (!allowedCountries.length) return Response.json({ error: 'These items do not share a delivery destination.' }, { status: 400 })
  let snapshot, packing
  try {
    packing = [...treats.map(t => t.shop_products ? snapshotShopProduct(t.shop_products, 1, null, 'Trick-or-Treat bundle') : {product_name:t.name,quantity:1,fulfillment:'manual',bundle_name:'Trick-or-Treat bundle'}), ...standalone.map(r => snapshotShopProduct(r.shop_products, 1, null, 'Trick-or-Treat bundle'))]
    const demand = new Map()
    for (const part of packing) {
      if (part.fulfillment === 'printify' && (!part.printify_product_id || !Number.isSafeInteger(Number(part.printify_variant_id)) || Number(part.printify_variant_id)<1)) throw new Error('A product is not ready to ship.')
      if (part.product_id) demand.set(part.product_id, (demand.get(part.product_id) || 0) + part.quantity)
    }
    for (const product of [...treats.map(t => t.shop_products), ...standalone.map(r => r.shop_products)].filter(Boolean)) {
      if (product.external_url || product.fulfillment === 'external') throw new Error('A selected product must be purchased from its partner shop.')
      const variant = product.variants?.find(v => String(v.printify_variant_id) === String(product.printify_variant_id)) || product.variants?.[0]
      if ((product.inventory != null && product.inventory < demand.get(product.id)) || (variant?.inventory != null && variant.inventory < demand.get(product.id))) throw new Error('A selected product is out of stock.')
    }
    snapshot = encodeShopSnapshot(packing)
  } catch (error) { return Response.json({error:error.message}, {status:400}) }
  const customer = await ensureStripeCustomer(db, stripe, user.id)
  if (!customer) return Response.json({ error: 'Your billing account could not be linked.' }, { status: 409 })
  try {
  const session = await createReservedCheckout({db,stripe,userId:user.id,requestId,kind:'tot_bundle',inventory:packing.filter(p=>p.product_id).map(p=>({product_id:p.product_id,quantity:p.quantity,variant_id:p.printify_variant_id || null})),treatIds,params:{
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency,
        unit_amount: amount,
        product_data: {
          name: collection.name,
          description: description || undefined,
          images: firstImage ? [firstImage] : undefined,
          metadata: {
            kind: 'tot_bundle',
            collection_id: collectionId,
            treat_ids: treatIds.join(','),
            standalone_product_ids: standalone.map(r => r.product_id).join(','),
          },
        },
      },
    }],
    success_url: `${origin}/shop/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancel.toString(),
    client_reference_id: user.id,
    customer,
    metadata: {
      kind: 'tot_bundle',
      collection_id: collectionId,
      treat_ids: treatIds.join(','),
      standalone_product_ids: standalone.map(r => r.product_id).join(','),
      userId: user.id,
      ...snapshot,
    },
    shipping_address_collection: {
      allowed_countries: allowedCountries,
    },
    phone_number_collection: { enabled: true },
  }})

  return Response.json({ url: session.url })
  } catch(error) {return Response.json({error:error.message},{status:409})}
}
