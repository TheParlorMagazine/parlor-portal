import { priceForCurrency } from './geo'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function prepareShopCart(db, items, currency, country) {
  if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error('Choose between 1 and 50 cart items.')
  for (const item of items) if (!UUID.test(item.id) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) throw new Error('Invalid cart item or quantity.')
  const ids = [...new Set(items.map(i => i.id))]
  const [pr, br] = await Promise.all([
    db.from('shop_products').select('*').in('id', ids).eq('active', true),
    db.from('shop_bundles').select('*, shop_bundle_items(quantity, variant_id, shop_products(*))').in('id', ids).eq('active', true),
  ])
  if (pr.error || br.error) throw new Error('Could not load the shop catalogue.')
  const products = new Map((pr.data || []).map(p => [p.id, p])), bundles = new Map((br.data || []).map(p => [p.id, p]))
  const lineItems = [], shippingItems = [], demand = new Map(), variantDemand = new Map()
  let unpricedStart = 0
  function component(p, qty, variantId) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 400) throw new Error('Invalid bundle component quantity.')
    if (!p || p.external_url || p.fulfillment === 'external') throw new Error('This product must be purchased from its partner shop.')
    if (p.ships_to === 'us_only' && country !== 'US') throw new Error(`${p.name} only ships within the United States.`)
    if (Array.isArray(p.ships_to) && p.ships_to.length && !p.ships_to.includes(country)) throw new Error(`${p.name} does not ship to ${country}.`)
    const count = (demand.get(p.id) || 0) + qty; demand.set(p.id, count)
    if (p.inventory != null && Number(p.inventory) < count) throw new Error(`${p.name} is out of stock for this quantity.`)
    const variants = p.variants || []
    const chosen = variantId != null ? variants.find(v => String(v.printify_variant_id) === String(variantId)) : (variants.find(v => String(v.printify_variant_id) === String(p.printify_variant_id)) || variants[0])
    if (variantId != null && !chosen && String(p.printify_variant_id) !== String(variantId)) throw new Error('This product variant is no longer available.')
    const variantKey = `${p.id}:${chosen?.printify_variant_id || variantId || ''}`
    const variantCount = (variantDemand.get(variantKey) || 0) + qty
    variantDemand.set(variantKey, variantCount)
    if (chosen?.inventory != null && Number(chosen.inventory) < variantCount) throw new Error('This variant is out of stock.')
    const vid = chosen?.printify_variant_id || p.printify_variant_id
    const pid = chosen?.printify_product_id || p.printify_product_id
    if (p.fulfillment === 'printify' && (!pid || !vid)) throw new Error('This product is not ready to ship.')
    shippingItems.push({ id: p.id, qty, printify_variant_id: vid, resolvedProduct: { ...p, printify_product_id: pid, printify_variant_id: vid } })
    return { product_id: pid, variant_id: vid, quantity: qty, fulfillment: p.fulfillment || 'manual', shop_product_id: p.id, variantName: chosen?.name || p.variant || '', sku: chosen?.sku || p.sku || '', priceSource: chosen?.price != null ? chosen : p }
  }
  function line(p, qty, amount, md, name = p.name || p.title) {
    const cents = Math.round(Number(amount) * 100)
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('A product price is unavailable.')
    const parts = shippingItems.slice(unpricedStart)
    const weight = parts.reduce((sum, part) => sum + Number(part.resolvedProduct.price || 1) * part.qty, 0)
    for (const part of parts) part.shippingUnitPrice = (cents / 100) * qty * Number(part.resolvedProduct.price || 1) / weight
    unpricedStart = shippingItems.length
    lineItems.push({ quantity: qty, price_data: { currency, unit_amount: cents, product_data: { name, ...(p.images?.[0] ? { images: [p.images[0]] } : {}), metadata: md } } })
  }
  for (const item of items) {
    const bundle = bundles.get(item.id)
    if (bundle) {
      const parts = bundle.shop_bundle_items || []
      if (!parts.length) throw new Error('This bundle is empty.')
      for (const part of parts) component(part.shop_products, item.qty * (part.quantity || 1), part.variant_id)
      line(bundle, item.qty, priceForCurrency(bundle, currency), { shop_bundle_id: bundle.id, fulfillment: 'bundle' })
      continue
    }
    const p = products.get(item.id)
    if (!p) throw new Error('A cart item is no longer available.')
    if (item.single_pick || item.bundle_picks?.length) {
      const config = p.bundle_config
      const picks = item.single_pick ? [item.single_pick] : item.bundle_picks
      if (!config || !Array.isArray(picks) || !picks.length || picks.some(id => !config.product_ids?.includes(id))) throw new Error('Invalid bundle selection.')
      if (!item.single_pick && picks.length !== Number(config.qty)) throw new Error('Complete your bundle selection before checkout.')
      const { data: selected, error } = await db.from('shop_products').select('*').in('id', [...new Set(picks)])
      if (error || selected?.length !== new Set(picks).size) throw new Error('A selected product is unavailable.')
      const byId = new Map(selected.map(pick => [pick.id, pick]))
      for (const id of picks) component(byId.get(id), item.qty, null)
      if (item.single_pick) {
        const pick = byId.get(item.single_pick), v = shippingItems[shippingItems.length - 1].resolvedProduct
        line(pick, item.qty, priceForCurrency(pick, currency), { shop_product_id: pick.id, fulfillment: pick.fulfillment || 'manual', printify_product_id: v.printify_product_id || '', printify_variant_id: String(v.printify_variant_id || '') })
      } else {
        // Persist the validated selections; the webhook expands every pick.
        line(p, item.qty, priceForCurrency({ price: config.price, price_eur: config.price_eur, price_gbp: config.price_gbp }, currency), { shop_product_id: p.id, fulfillment: 'pick_bundle', bundle_pick_ids: picks.join(',') })
      }
      continue
    }
    if (p.bundle_config) throw new Error('Choose the products for this bundle before checkout.')
    const part = component(p, item.qty, item.printify_variant_id)
    line(p, item.qty, priceForCurrency(part.priceSource, currency), { shop_product_id: p.id, fulfillment: part.fulfillment, variant_name: part.variantName, sku: part.sku, printify_product_id: part.product_id || '', printify_variant_id: String(part.variant_id || '') })
  }
  return { lineItems, shippingItems }
}
