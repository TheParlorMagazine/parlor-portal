import Stripe from 'stripe'
import { serviceClient } from '../../../../lib/apiAuth'
import { currencyForRequest, priceForCurrency } from '../../../../lib/geo'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  let body = {}; try { body = await request.json() } catch {}
  const { treatIds, collectionId, successUrl, cancelUrl, userId } = body

  if (!Array.isArray(treatIds) || !treatIds.length || !collectionId || !successUrl || !cancelUrl) {
    return Response.json({ error: 'treatIds, collectionId, successUrl and cancelUrl are required' }, { status: 400 })
  }

  const db = serviceClient()

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
    .select('id, name, stock, house_id, product_id, shop_products(id, name, images)')
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

  // 3. Load standalone products (always-included items like the tote)
  const { data: standaloneRows } = await db
    .from('tot_collection_products')
    .select('product_id, shop_products(id, name, images)')
    .eq('collection_id', collectionId)
    .order('sort_order')

  const standalone = (standaloneRows || []).filter(r => r.product_id)

  // 4. Build the Stripe line item — one flat bundle price
  const currency = currencyForRequest(request)
  const bundlePrice = { price: collection.price, price_eur: collection.price_eur, price_gbp: collection.price_gbp }
  const amount = Math.round(priceForCurrency(bundlePrice, currency) * 100)
  if (!amount) return Response.json({ error: 'Bundle price not configured for this currency' }, { status: 400 })

  const treatNames = (treats || []).map(t => t.shop_products?.name || t.name).join(', ')
  const standaloneNames = standalone.map(r => r.shop_products?.name || '').filter(Boolean).join(', ')
  const description = [standaloneNames, treatNames].filter(Boolean).join(' · ')

  // First treat's product image as the Stripe thumbnail (or standalone image)
  const firstImage = standalone[0]?.shop_products?.images?.[0]
    || treats?.[0]?.shop_products?.images?.[0]

  const session = await stripe.checkout.sessions.create({
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
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId || undefined,
    metadata: {
      kind: 'tot_bundle',
      collection_id: collectionId,
      treat_ids: treatIds.join(','),
      standalone_product_ids: standalone.map(r => r.product_id).join(','),
      userId: userId || '',
    },
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'FR', 'DE', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT', 'CH', 'PT', 'MX', 'BR', 'JP'],
    },
    phone_number_collection: { enabled: true },
  })

  return Response.json({ url: session.url })
}
