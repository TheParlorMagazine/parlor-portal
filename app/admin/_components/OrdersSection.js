'use client'

import { useEffect, useState } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'
const DP = '#c4364a'

const input = { width: '100%', padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }
const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '0 0 5px' }

const STATUS_META = {
  processing: { label: 'Processing', bg: '#fff4e5', color: '#9a6a1a' },
  shipped:    { label: 'Shipped',    bg: '#e8f0fe', color: '#2c5fb3' },
  fulfilled:  { label: 'Fulfilled',  bg: '#e7f6ec', color: '#2d7a4a' },
  cancelled:  { label: 'Cancelled',  bg: '#f6e7e7', color: '#a23b3b' },
}
const STATUSES = ['processing', 'shipped', 'fulfilled', 'cancelled']

function money(cents, currency = 'usd') {
  if (cents == null) return '—'
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100) }
  catch { return `$${(cents / 100).toFixed(2)}` }
}
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

function OrderRow({ order, token, onChanged }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({
    status: order.status, carrier: order.carrier || '', tracking_number: order.tracking_number || '',
    tracking_url: order.tracking_url || '', admin_note: order.admin_note || '',
  })
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const sm = STATUS_META[order.status] || STATUS_META.processing

  async function save() {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id: order.id, ...f, notify }),
    })
    setBusy(false)
    if (res.ok) { setMsg('Saved ✓'); onChanged() } else { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Could not save.') }
  }

  async function remove() {
    if (!window.confirm(`Delete order ${order.order_number || ''}? This can’t be undone.`)) return
    setBusy(true)
    const res = await fetch(`/api/admin/orders?id=${order.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } })
    setBusy(false)
    if (res.ok) onChanged()
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 11, marginBottom: 12, background: '#fff', overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ flex: '0 0 120px' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{order.order_number || order.id.slice(0, 8)}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{fmtDate(order.placed_at)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {order.member_name || order.member_email || 'Guest'}
          </div>
          <div style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(order.items || []).map(i => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') || '—'}
          </div>
        </div>
        <div style={{ flex: '0 0 auto', fontSize: 13, color: '#444' }}>{money(order.total_cents, order.currency)}</div>
        <span style={{ flex: '0 0 auto', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 11px', borderRadius: 999, background: sm.bg, color: sm.color }}>{sm.label}</span>
        <span style={{ flex: '0 0 auto', color: '#bbb', fontSize: 13 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '4px 16px 18px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '16px 0' }}>
            <div>
              <div style={label}>Ship to</div>
              <div style={{ fontSize: 13, color: '#444', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {[order.shipping_name, order.shipping_address].filter(Boolean).join('\n') || '—'}
              </div>
              {order.member_email && <div style={{ fontSize: 12.5, color: '#999', marginTop: 6 }}>{order.member_email}</div>}
            </div>
            <div>
              <div style={label}>Items</div>
              {(order.items || []).map((it, i) => (
                <div key={i} style={{ fontSize: 13, color: '#444', display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                  <span>{it.product_name}{it.variant ? ` · ${it.variant}` : ''}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
                  <span style={{ color: '#888' }}>{money((it.unit_price_cents || 0) * (it.quantity || 1), order.currency)}</span>
                </div>
              ))}
              <div style={{ fontSize: 12.5, color: '#999', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                Subtotal {money(order.subtotal_cents, order.currency)} · Shipping {money(order.shipping_cents, order.currency)} · <strong>Total {money(order.total_cents, order.currency)}</strong>
              </div>
            </div>
          </div>

          <div style={{ background: '#faf7f8', border: `1px solid ${BORDER}`, borderRadius: 9, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr', gap: 12 }}>
              <div><div style={label}>Status</div>
                <select value={f.status} onChange={e => set('status', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
              <div><div style={label}>Carrier</div><input value={f.carrier} onChange={e => set('carrier', e.target.value)} placeholder="USPS / UPS / FedEx" style={input} /></div>
              <div><div style={label}>Tracking #</div><input value={f.tracking_number} onChange={e => set('tracking_number', e.target.value)} style={input} /></div>
            </div>
            <div style={{ marginTop: 10 }}><div style={label}>Tracking URL (member’s “Track shipment” link)</div><input value={f.tracking_url} onChange={e => set('tracking_url', e.target.value)} placeholder="https://tools.usps.com/…" style={input} /></div>
            <div style={{ marginTop: 10 }}><div style={label}>Internal note</div><input value={f.admin_note} onChange={e => set('admin_note', e.target.value)} style={input} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <button onClick={save} disabled={busy} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontFamily: ff, fontSize: 13.5, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save'}</button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#666', cursor: 'pointer' }}>
                <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /> Email buyer when marked shipped
              </label>
              <button onClick={remove} disabled={busy} style={{ marginLeft: 'auto', padding: '9px 14px', background: 'none', color: DP, border: `1px solid #e2b4b4`, borderRadius: 8, fontFamily: ff, fontSize: 12.5, cursor: 'pointer' }}>Delete</button>
              {msg && <span style={{ fontSize: 12.5, color: msg.includes('✓') ? '#2d7a4a' : DP }}>{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NewOrderModal({ token, onClose, onSaved }) {
  const [f, setF] = useState({ email: '', shipping_name: '', shipping_address: '', shipping_cents: '' })
  const [items, setItems] = useState([{ product_name: '', variant: '', quantity: 1, unit_price: '' }])
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const setItem = (i, k, v) => setItems(list => list.map((it, j) => j === i ? { ...it, [k]: v } : it))

  async function save() {
    const clean = items.filter(i => i.product_name.trim())
    if (!clean.length) { setMsg('Add at least one item.'); return }
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({
        email: f.email || null,
        shipping_name: f.shipping_name || null,
        shipping_address: f.shipping_address || null,
        shipping_cents: f.shipping_cents ? Math.round(Number(f.shipping_cents) * 100) : 0,
        items: clean.map(i => ({ product_name: i.product_name, variant: i.variant || null, quantity: Number(i.quantity) || 1, unit_price_cents: i.unit_price ? Math.round(Number(i.unit_price) * 100) : 0 })),
      }),
    })
    setBusy(false)
    if (res.ok) { onSaved(); onClose() } else { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Could not create.') }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 620, maxWidth: '96vw', padding: 26, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: ffH, fontSize: 22, fontWeight: 700 }}>New manual order</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: '#999', margin: '0 0 16px' }}>For orders placed outside Stripe. Stripe shop checkouts create orders automatically.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><div style={label}>Buyer email</div><input value={f.email} onChange={e => set('email', e.target.value)} style={input} /></div>
          <div><div style={label}>Ship-to name</div><input value={f.shipping_name} onChange={e => set('shipping_name', e.target.value)} style={input} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><div style={label}>Shipping address</div><textarea rows={2} value={f.shipping_address} onChange={e => set('shipping_address', e.target.value)} style={{ ...input, resize: 'vertical' }} /></div>

        <div style={label}>Items</div>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px 80px 28px', gap: 8, marginBottom: 8 }}>
            <input value={it.product_name} onChange={e => setItem(i, 'product_name', e.target.value)} placeholder="Product" style={input} />
            <input value={it.variant} onChange={e => setItem(i, 'variant', e.target.value)} placeholder="Variant" style={input} />
            <input type="number" min="1" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} placeholder="Qty" style={input} />
            <input type="number" step="0.01" value={it.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} placeholder="$ each" style={input} />
            <button onClick={() => setItems(list => list.filter((_, j) => j !== i))} disabled={items.length === 1} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        ))}
        <button onClick={() => setItems(list => [...list, { product_name: '', variant: '', quantity: 1, unit_price: '' }])} style={{ border: `1px dashed ${BORDER}`, background: 'none', color: '#666', borderRadius: 7, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', fontFamily: ff }}>+ Add item</button>

        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'end', marginTop: 14 }}>
          <div><div style={label}>Shipping $</div><input type="number" step="0.01" value={f.shipping_cents} onChange={e => set('shipping_cents', e.target.value)} placeholder="0.00" style={input} /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            {msg && <span style={{ fontSize: 12.5, color: DP, alignSelf: 'center' }}>{msg}</span>}
            <button onClick={save} disabled={busy} style={{ padding: '10px 22px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontFamily: ff, fontSize: 14, cursor: 'pointer' }}>{busy ? 'Creating…' : 'Create order'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersSection({ supabase }) {
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${await token()}` } })
    if (res.ok) { const d = await res.json(); setOrders(d.orders || []) } else setOrders([])
  }
  useEffect(() => { load() }, [])

  const shown = (orders || []).filter(o => filter === 'all' || o.status === filter)
  const counts = (orders || []).reduce((m, o) => { m[o.status] = (m[o.status] || 0) + 1; return m }, {})

  return (
    <div style={{ fontFamily: ff, padding: '4px 4px 40px', maxWidth: 920 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: 27, fontWeight: 700, margin: 0 }}>Orders</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>Shop orders — set status, add tracking, mark fulfilled.</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: '10px 18px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontFamily: ff, fontSize: 13.5, cursor: 'pointer' }}>+ New order</button>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '20px 0 18px', flexWrap: 'wrap' }}>
        {['all', ...STATUSES].map(s => {
          const active = filter === s
          const n = s === 'all' ? (orders || []).length : (counts[s] || 0)
          return (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 14px', border: `1px solid ${active ? '#0a0a0a' : BORDER}`, background: active ? '#0a0a0a' : '#fff', color: active ? '#fff' : '#555', borderRadius: 999, fontSize: 12.5, cursor: 'pointer', fontFamily: ff }}>
              {s === 'all' ? 'All' : STATUS_META[s].label} ({n})
            </button>
          )
        })}
      </div>

      {orders === null && <div style={{ color: '#999', fontSize: 14, padding: 20 }}>Loading orders…</div>}
      {orders !== null && shown.length === 0 && (
        <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 12, padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
          {(orders || []).length === 0 ? 'No orders yet. Stripe shop checkouts appear here automatically, or add one manually.' : 'No orders with this status.'}
        </div>
      )}
      {shown.map(o => <OrderRow key={o.id} order={o} token={token} onChanged={load} />)}

      {creating && <NewOrderModal token={token} onClose={() => setCreating(false)} onSaved={load} />}
    </div>
  )
}
