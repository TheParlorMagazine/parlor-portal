// Stripe amounts use minor units; GA4 expects major currency units.
const ZERO_DECIMAL = new Set(['bif','clp','djf','gnf','jpy','kmf','krw','mga','pyg','rwf','ugx','vnd','vuv','xaf','xof','xpf'])
export function purchaseEvent(session) {
  if (session.status !== 'complete' || session.payment_status !== 'paid' || !Number.isInteger(session.amount_total) || session.amount_total <= 0 || !/^[a-z]{3}$/i.test(session.currency || '')) return null
  const divisor = ZERO_DECIMAL.has(session.currency.toLowerCase()) ? 1 : 100
  const shipping = session.shipping_cost?.amount_total || 0, tax = session.total_details?.amount_tax || 0
  return { key: `purchase:${session.id}`, name: 'purchase', params: {
    transaction_id: session.id, currency: session.currency.toUpperCase(),
    value: Math.max(0,session.amount_total - shipping - tax) / divisor,
    shipping: shipping / divisor, tax: tax / divisor,
    items: (session.line_items?.data || []).map(line => ({
      item_id: typeof line.price?.product === 'string' ? line.price.product : line.price?.product?.id || line.price?.id || 'purchase',
      quantity: line.quantity || 1,
      price: Math.max(0,(line.amount_total || 0) - (line.amount_tax || 0)) / divisor / (line.quantity || 1),
    })),
  } }
}
