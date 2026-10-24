const text = { fontSize: 13, lineHeight: 1.55, color: '#444' }

export default function OrderPackingList({ order }) {
  const items = order.metadata?.packing_items
  if (!Array.isArray(items) || !items.length) return <p style={{ ...text, color: '#888' }}>A packing breakdown wasn’t saved for this older order. Check its original bundle selections before packing.</p>
  const manual = items.filter(item => item.fulfillment !== 'printify')
  const printify = items.filter(item => item.fulfillment === 'printify')
  const list = (rows, title) => rows.length > 0 && <section aria-label={title} style={{ marginBottom: 14 }}>
    <h3 style={{ font: 'inherit', fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
    <ul style={{ paddingLeft: 20, margin: 0 }}>
      {rows.map((item, index) => <li key={index} style={{ ...text, marginBottom: 8 }}>
        <strong>{item.quantity} × {item.product_name}</strong>{item.variant ? ` · ${item.variant}` : ''}
        {(item.sku || item.bundle_name) && <div style={{ fontSize: 12, color: '#777' }}>{[item.sku ? `SKU: ${item.sku}` : '', item.bundle_name ? `From: ${item.bundle_name}` : ''].filter(Boolean).join(' · ')}</div>}
      </li>)}
    </ul>
  </section>
  return <div style={{ background: '#fff8fa', border: '1px solid #ead6dc', borderRadius: 9, padding: 14, margin: '0 0 16px' }}>
    <h2 style={{ font: 'inherit', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Packing list</h2>
    <p style={{ ...text, fontSize: 12, color: '#777', margin: '0 0 12px' }}>Quantities below are totals for this order, including all bundle contents.</p>
    {list(manual, 'Pick and pack — self fulfilled')}
    {list(printify, 'Printify — shipped separately')}
    {!manual.length && <p style={text}>No items need packing by The Parlor.</p>}
  </div>
}
