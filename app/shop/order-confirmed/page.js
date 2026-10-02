'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ShopHeader from '../../_components/ShopHeader'
import SiteFooter from '../../_components/SiteFooter'
import { useCart } from '../../../lib/useCart'

const DISPLAY = "'Playfair Display', Georgia, serif"
const BODY = "'Source Serif 4', Georgia, serif"
const BLACK = '#0a0a0a'
const money = (c, cur = 'usd') => (c == null ? '' : `${cur === 'gbp' ? '£' : cur === 'eur' ? '€' : '$'}${(c / 100).toFixed(2)}`)

function Confirmed() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const { clear } = useCart()
  const [order, setOrder] = useState(undefined) // undefined=loading, null=not found yet, object=found

  // The purchase succeeded — empty the cart.
  useEffect(() => { clear() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The order is created by the Stripe webhook moments after redirect, so poll briefly.
  useEffect(() => {
    if (!sessionId) { setOrder(null); return }
    let tries = 0, alive = true, timer
    const poll = async () => {
      try {
        const d = await fetch(`/api/shop/order-by-session?session_id=${encodeURIComponent(sessionId)}`).then(r => r.json())
        if (!alive) return
        if (d.order) { setOrder(d.order); return }
      } catch {}
      if (!alive) return
      tries++
      if (tries < 6) timer = setTimeout(poll, 1500)
      else setOrder(null)
    }
    poll()
    return () => { alive = false; clearTimeout(timer) }
  }, [sessionId])

  const cur = order?.currency || 'usd'

  return (
    <div style={{ background: '#f6e4e7', minHeight: '100vh' }}>
      <ShopHeader />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px 90px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 22px' }}>✓</div>
        <p style={{ fontFamily: BODY, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a06a76', margin: '0 0 10px' }}>Order confirmed</p>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 700, color: BLACK, margin: '0 0 14px', lineHeight: 1.1 }}>Thank you for your order</h1>
        <p style={{ fontFamily: BODY, fontSize: 16.5, lineHeight: 1.65, color: '#5a3d44', margin: '0 auto 30px', maxWidth: 460 }}>
          We’ve emailed your receipt{order?.order_number ? <> and confirmation for <strong>{order.order_number}</strong></> : ''}. You can follow it from placement to delivery in your account.
        </p>

        {order && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px 26px', textAlign: 'left', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', margin: '0 0 28px' }}>
            {(order.items || []).map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontFamily: BODY, fontSize: 14.5, color: '#1a1a1a' }}>
                <span>{it.product_name}{it.variant ? <span style={{ color: '#999' }}> ({it.variant})</span> : ''} × {it.quantity}</span>
                <span>{money((it.unit_price_cents || 0) * (it.quantity || 1), cur)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 14, color: '#666', padding: '10px 0 2px' }}><span>Subtotal</span><span>{money(order.subtotal_cents, cur)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 14, color: '#666', paddingBottom: 8 }}><span>Shipping</span><span>{order.shipping_cents ? money(order.shipping_cents, cur) : 'Free'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 16, fontWeight: 700, color: BLACK, paddingTop: 8, borderTop: '1px solid #eee' }}><span>Total</span><span>{money(order.total_cents, cur)}</span></div>
          </div>
        )}
        {order === undefined && <p style={{ fontFamily: BODY, fontSize: 14, color: '#a06a76', margin: '0 0 28px' }}>Finalizing your order details…</p>}

        <a href="/portal/orders" style={{ display: 'inline-block', background: BLACK, color: '#fff', fontFamily: BODY, fontSize: 15, letterSpacing: '0.03em', padding: '14px 30px', borderRadius: 26, textDecoration: 'none' }}>Track your order →</a>
        <div style={{ marginTop: 18 }}>
          <a href="/shop" style={{ fontFamily: BODY, fontSize: 14, color: '#7a2531', textDecoration: 'none' }}>← Continue shopping</a>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}

export default function OrderConfirmedPage() {
  return <Suspense><Confirmed /></Suspense>
}
