// Stripe metadata values are limited to 500 characters and 50 keys. Keep the
// server-created purchase snapshot with the payment, never in browser storage.
export function encodeShopSnapshot(value) {
  const json = JSON.stringify(value)
  const chunks = Array.from(json)
  const metadata = { packing_version: '1' }
  for (let i = 0; i < chunks.length; i += 400) {
    if (i / 400 >= 35) throw new Error('This bundle is too large for checkout. Please split the order.')
    metadata[`packing_${i / 400}`] = chunks.slice(i, i + 400).join('')
  }
  return metadata
}
export function decodeShopSnapshot(metadata) {
  if (!metadata?.packing_version) return null // Historical checkout.
  if (metadata.packing_version !== '1') throw new Error('Unsupported purchase snapshot')
  let json = ''
  for (let i = 0; i < 35 && metadata[`packing_${i}`] != null; i++) json += metadata[`packing_${i}`]
  const result = JSON.parse(json)
  if (!Array.isArray(result) || !result.length || result.some(p => !p.product_name || !Number.isInteger(p.quantity) || p.quantity < 1)) throw new Error('Invalid purchase snapshot')
  return result
}
export function snapshotShopProduct(p, quantity, variantId = null, bundleName = null) {
  const variants = p.variants || []
  const v = variants.find(v => String(v.printify_variant_id) === String(variantId ?? p.printify_variant_id)) || (variantId == null ? variants[0] : null)
  return { product_id:p.id, product_name:p.name, variant:v?.name || p.variant || null, sku:v?.sku || p.sku || null, quantity, fulfillment:p.fulfillment === 'printify' ? 'printify' : 'manual', printify_product_id:v?.printify_product_id || p.printify_product_id || null, printify_variant_id:v?.printify_variant_id || variantId || p.printify_variant_id || null, bundle_name:bundleName, image_url:p.images?.[0] || null }
}
