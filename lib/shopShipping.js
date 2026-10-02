import { printifyConfigured, resolveShopId, calcShipping } from './printify'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Flat per-order shipping for self-fulfilled (manual) items — magazines, prints,
// etc. that you ship yourself. Adjust to your real cost. In the same-numeral
// model this figure is charged in the visitor's currency.
export const MANUAL_SHIP_CENTS = 500

// Quote shipping for a cart to a destination country. Printify-fulfilled items
// get a live standard-shipping quote; self-fulfilled items add a flat rate;
// external-link items are ignored (bought elsewhere). Returns an integer amount
// (cents) charged in the checkout currency (same-numeral, like product prices).
export async function quoteCartShipping(db, items, country) {
  const ids = [...new Set((items || []).map(i => i.id).filter(id => UUID.test(id)))]
  if (!ids.length) return { cents: 0, printify: false }

  const { data: products } = await db.from('shop_products')
    .select('id, fulfillment, printify_product_id, printify_variant_id, variants')
    .in('id', ids).eq('active', true)
  const byId = new Map((products || []).map(p => [p.id, p]))

  const printifyLines = []
  let hasManual = false
  for (const it of items) {
    const p = byId.get(it.id); if (!p) continue
    const qty = Math.max(1, Math.min(20, Number(it.qty) || 1))
    if (p.fulfillment === 'printify' && p.printify_product_id) {
      const vid = it.printify_variant_id || p.printify_variant_id || p.variants?.[0]?.printify_variant_id
      if (vid) printifyLines.push({ product_id: String(p.printify_product_id), variant_id: Number(vid), quantity: qty })
    } else if (p.fulfillment !== 'external') {
      hasManual = true
    }
  }

  let cents = 0
  if (printifyLines.length && printifyConfigured()) {
    try {
      const shopId = await resolveShopId()
      const res = await calcShipping(shopId, printifyLines, country || 'US')
      cents += res?.standard || 0
    } catch (e) {
      cents += MANUAL_SHIP_CENTS // fallback if the live quote fails
    }
  }
  if (hasManual) cents += MANUAL_SHIP_CENTS
  return { cents, printify: printifyLines.length > 0 }
}
