'use client'

import { useState, useEffect, Fragment } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell from '../_components/PortalShell'
import { fieldCss } from '../_components/formCss'

// Lifecycle we track, in order — placement through fulfillment only.
const STEPS = [
  { key: 'placed', label: 'Ordered' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'fulfilled', label: 'Fulfilled' },
]
// How far along a given status is (index into STEPS reached).
const REACHED = { processing: 1, shipped: 2, fulfilled: 3 }

function money(cents, currency = 'usd') {
  if (cents == null) return ''
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100) }
  catch { return `$${(cents / 100).toFixed(2)}` }
}
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const ordersCss = `
  .ord-list { display:flex; flex-direction:column; gap:18px; }
  .ord-card { border:1px solid var(--border); border-radius:14px; background:#fff; overflow:hidden; }
  .ord-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:18px 20px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
  .ord-num { font-family:'thermal-variable', Georgia, serif; font-size:16px; font-weight:600; color:var(--ink,#000); }
  .ord-date { font-size:12.5px; color:var(--muted,#888); margin-top:2px; }
  .ord-status-pill { font-size:11px; letter-spacing:0.05em; text-transform:uppercase; padding:4px 12px; border-radius:999px; font-weight:600; white-space:nowrap; }
  .ord-status-pill.processing { background:#fff4e5; color:#9a6a1a; }
  .ord-status-pill.shipped { background:#e8f0fe; color:#2c5fb3; }
  .ord-status-pill.fulfilled { background:#e7f6ec; color:#2d7a4a; }
  .ord-status-pill.cancelled { background:#f6e7e7; color:#a23b3b; }

  .ord-track { display:flex; align-items:center; padding:22px 20px 6px; }
  .ord-step { display:flex; flex-direction:column; align-items:center; flex:0 0 auto; width:70px; text-align:center; }
  .ord-dot { width:22px; height:22px; border-radius:50%; border:2px solid var(--border); background:#fff; display:flex; align-items:center; justify-content:center; color:#fff; }
  .ord-dot svg { width:12px; height:12px; }
  .ord-step.done .ord-dot { background:#000; border-color:#000; }
  .ord-step.current .ord-dot { background:#000; border-color:#000; box-shadow:0 0 0 4px rgba(0,0,0,0.08); }
  .ord-step-label { font-size:11px; color:var(--muted,#888); margin-top:7px; letter-spacing:0.02em; }
  .ord-step.done .ord-step-label, .ord-step.current .ord-step-label { color:var(--ink,#000); font-weight:600; }
  .ord-bar { flex:1 1 auto; height:2px; background:var(--border); margin:0 -6px; margin-bottom:22px; align-self:center; min-width:14px; }
  .ord-bar.done { background:#000; }

  .ord-tracking { margin:8px 20px 0; padding:12px 14px; background:var(--cream,#fdf5f6); border:1px solid var(--border); border-radius:10px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
  .ord-tracking-label { font-size:12px; color:var(--muted,#888); }
  .ord-tracking-num { font-size:13.5px; font-weight:600; color:var(--ink,#000); font-variant-numeric:tabular-nums; }
  .ord-track-btn { font-size:12.5px; font-weight:600; color:#fff; background:#000; border:none; border-radius:8px; padding:8px 14px; cursor:pointer; text-decoration:none; white-space:nowrap; }
  .ord-track-btn:hover { opacity:0.88; }

  .ord-cancel-note { margin:12px 20px 0; font-size:13px; color:#a23b3b; }

  .ord-items { padding:16px 20px 4px; display:flex; flex-direction:column; gap:12px; }
  .ord-item { display:flex; gap:12px; align-items:center; }
  .ord-item-thumb { width:48px; height:48px; border-radius:8px; background:#f2eef0; flex:0 0 48px; overflow:hidden; }
  .ord-item-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .ord-item-name { font-size:14px; color:var(--ink,#000); font-weight:500; }
  .ord-item-meta { font-size:12px; color:var(--muted,#888); margin-top:1px; }
  .ord-item-price { margin-left:auto; font-size:13px; color:#444; white-space:nowrap; }

  .ord-foot { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; padding:14px 20px 18px; border-top:1px solid var(--border); margin-top:8px; flex-wrap:wrap; }
  .ord-ship-to { font-size:12px; color:var(--muted,#888); line-height:1.5; white-space:pre-line; }
  .ord-ship-to strong { display:block; color:#444; font-weight:600; margin-bottom:2px; }
  .ord-total { font-size:14px; color:var(--ink,#000); font-weight:600; text-align:right; }
  .ord-total small { display:block; font-size:11.5px; color:var(--muted,#888); font-weight:400; margin-bottom:2px; }

  .ord-empty { border:1px dashed var(--border); border-radius:14px; padding:44px 24px; text-align:center; }
  .ord-empty-title { font-family:'thermal-variable', Georgia, serif; font-size:18px; color:var(--ink,#000); margin-bottom:6px; }
  .ord-empty-sub { font-size:13.5px; color:var(--muted,#888); }
`

const CHECK = <svg viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>

function Timeline({ order }) {
  if (order.status === 'cancelled') return null
  const reached = REACHED[order.status] ?? 0 // index of the furthest completed/current step
  return (
    <div className="ord-track">
      {STEPS.map((s, i) => (
        <Fragment key={s.key}>
          {i > 0 && <div className={`ord-bar${i <= reached ? ' done' : ''}`} />}
          <div className={`ord-step${i < reached ? ' done' : i === reached ? ' current' : ''}`}>
            <div className="ord-dot">{i <= reached ? CHECK : null}</div>
            <div className="ord-step-label">{s.label}</div>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

function Orders() {
  const supabase = createClient()
  const [state, setState] = useState('loading')
  const [orders, setOrders] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/portal/orders', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (cancelled) return
        if (res.ok) { setOrders(data.orders || []); setState('ready') } else setState('error')
      } catch { if (!cancelled) setState('error') }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <style>{fieldCss + ordersCss}</style>
      <h1 className="pg-title">Orders</h1>
      <p className="pg-sub">Track your shop purchases from order to fulfillment.</p>

      {state === 'loading' && <div className="pg-card">Loading your orders…</div>}
      {state === 'error' && <div className="pg-card">Couldn’t load your orders. Please try again.</div>}

      {state === 'ready' && orders.length === 0 && (
        <div className="ord-empty">
          <div className="ord-empty-title">No orders yet</div>
          <div className="ord-empty-sub">When you buy from The Parlor shop, your orders and shipment tracking will appear here.</div>
        </div>
      )}

      {state === 'ready' && orders.length > 0 && (
        <div className="ord-list">
          {orders.map(o => {
            const statusLabel = o.status === 'processing' ? 'Processing'
              : o.status === 'shipped' ? 'Shipped'
              : o.status === 'fulfilled' ? 'Fulfilled'
              : o.status === 'cancelled' ? 'Cancelled' : o.status
            const showTracking = (o.status === 'shipped' || o.status === 'fulfilled') && (o.tracking_number || o.tracking_url)
            return (
              <div className="ord-card" key={o.id}>
                <div className="ord-head">
                  <div>
                    <div className="ord-num">Order {o.order_number || o.id.slice(0, 8)}</div>
                    <div className="ord-date">Placed {fmtDate(o.placed_at)}{o.status === 'shipped' && o.shipped_at ? ` · Shipped ${fmtDate(o.shipped_at)}` : ''}{o.status === 'fulfilled' && o.fulfilled_at ? ` · Delivered ${fmtDate(o.fulfilled_at)}` : ''}</div>
                  </div>
                  <span className={`ord-status-pill ${o.status}`}>{statusLabel}</span>
                </div>

                <Timeline order={o} />

                {o.status === 'cancelled' && <div className="ord-cancel-note">This order was cancelled. If you were charged, a refund has been issued.</div>}

                {showTracking && (
                  <div className="ord-tracking">
                    <div>
                      <div className="ord-tracking-label">{o.carrier ? `${o.carrier} tracking` : 'Tracking number'}</div>
                      <div className="ord-tracking-num">{o.tracking_number || 'Available'}</div>
                    </div>
                    {o.tracking_url && <a className="ord-track-btn" href={o.tracking_url} target="_blank" rel="noopener noreferrer">Track shipment ↗</a>}
                  </div>
                )}

                {o.items.length > 0 && (
                  <div className="ord-items">
                    {o.items.map((it, i) => (
                      <div className="ord-item" key={i}>
                        <div className="ord-item-thumb">{it.image_url && <img src={it.image_url} alt="" loading="lazy" />}</div>
                        <div>
                          <div className="ord-item-name">{it.product_name}</div>
                          <div className="ord-item-meta">{[it.variant, it.quantity > 1 ? `Qty ${it.quantity}` : null].filter(Boolean).join(' · ')}</div>
                        </div>
                        {it.unit_price_cents != null && <div className="ord-item-price">{money(it.unit_price_cents * (it.quantity || 1), o.currency)}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="ord-foot">
                  <div className="ord-ship-to">
                    {o.shipping_address ? <><strong>Shipping to</strong>{[o.shipping_name, o.shipping_address].filter(Boolean).join('\n')}</> : null}
                  </div>
                  <div className="ord-total">
                    {o.shipping_cents ? <small>Subtotal {money(o.subtotal_cents, o.currency)} · Shipping {money(o.shipping_cents, o.currency)}</small> : null}
                    Total {money(o.total_cents, o.currency)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function OrdersPage() {
  return <PortalShell active="orders"><Orders /></PortalShell>
}
