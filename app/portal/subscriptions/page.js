'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell, { usePortal } from '../_components/PortalShell'
import { fieldCss } from '../_components/formCss'

const PLANS = [
  { id: 'fccb348a-7433-4080-8699-9ef8c0e7a519', label: "Reader's Circle", price: '$7 / month',
    desc: 'Full digital access — all articles, audio, and member-only content.' },
  { id: 'c666f321-47e5-40c1-bc2a-565a2f52f64d', label: 'Printing Press', price: '$30 / every 4 months',
    desc: "Everything in Reader's Circle, plus the triannual print magazine mailed to you." },
]

const extraCss = `
  .sub-plans { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
  .sub-plan { border:1px solid var(--border); border-radius:12px; padding:18px 20px; background:#fff; display:flex; flex-direction:column; }
  .sub-plan.current { border-color:#000; }
  .sub-plan-name { font-family:'thermal-variable', Georgia, serif; font-size:18px; font-weight:600; }
  .sub-plan-price { font-size:13px; color:var(--muted); margin:2px 0 8px; }
  .sub-plan-desc { font-size:13px; color:#555; line-height:1.5; margin-bottom:16px; flex:1; }
  .sub-current-tag { align-self:flex-start; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; background:#000; color:#fff; padding:3px 10px; border-radius:999px; margin-bottom:10px; }
  .btn-danger { background:none; color:#b23b3b; border:1px solid #e2b4b4; border-radius:8px; padding:9px 16px; font-size:13px; cursor:pointer; font-family:'thermal-variable', Georgia, serif; }
  .btn-danger:hover { background:#fdf0f0; }
  .sub-note { font-size:12.5px; color:var(--muted); margin-top:12px; }
  @media (max-width:640px){ .sub-plans{ grid-template-columns:1fr; } }

  .pd-eyebrow { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
  .pd-upcoming { display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--cream,#fdf5f6); border:1px solid var(--border); border-radius:11px; }
  .pd-upcoming svg { width:20px; height:20px; color:#8a6b72; flex:0 0 auto; }
  .pd-upcoming-title { font-size:14px; font-weight:600; color:var(--ink,#000); }
  .pd-upcoming-sub { font-size:12.5px; color:var(--muted); margin-top:1px; }
  .pd-ship { border:1px solid var(--border); border-radius:11px; padding:14px 16px; margin-top:10px; }
  .pd-ship-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap; }
  .pd-ship-title { font-size:14px; font-weight:600; color:var(--ink,#000); }
  .pd-ship-date { font-size:12.5px; color:var(--muted); margin-top:1px; }
  .pd-ship-badge { font-size:10.5px; letter-spacing:0.05em; text-transform:uppercase; font-weight:600; background:#e7f6ec; color:#2d7a4a; padding:3px 10px; border-radius:999px; white-space:nowrap; }
  .pd-track { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border); flex-wrap:wrap; }
  .pd-track-num { font-size:13px; font-weight:600; color:var(--ink,#000); }
  .pd-track-label { font-size:11.5px; color:var(--muted); }
  .pd-track-btn { font-size:12.5px; font-weight:600; color:#fff; background:#000; border:none; border-radius:8px; padding:8px 14px; text-decoration:none; white-space:nowrap; }
  .pd-track-btn:hover { opacity:0.88; }
`

function fmtDate(unixSec) {
  if (!unixSec) return ''
  return new Date(unixSec * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtDay(iso) {
  if (!iso) return ''
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function Subscriptions() {
  const ctx = usePortal()
  const supabase = createClient()
  const m = ctx?.member || {}
  const hasBilling = !!m.stripe_customer_id
  const planName = m.plan || 'Free'

  const [sub, setSub] = useState(undefined) // undefined=loading, null=none, {…}=active
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [print, setPrint] = useState(null) // { subscriber, upcoming[], shipments[] }

  async function token() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!hasBilling) { setSub(null); return }
      try {
        const res = await fetch('/api/portal/cancel-subscription', { headers: { Authorization: `Bearer ${await token()}` } })
        const data = await res.json()
        if (!cancelled) setSub(data.subscription || null)
      } catch { if (!cancelled) setSub(null) }
    }
    load()
    return () => { cancelled = true }
  }, [hasBilling])

  // Print-delivery schedule + tracking (Printing Press subscribers only).
  useEffect(() => {
    let cancelled = false
    async function loadPrint() {
      try {
        const res = await fetch('/api/portal/print-mailings', { headers: { Authorization: `Bearer ${await token()}` } })
        const data = await res.json()
        if (!cancelled && res.ok) setPrint(data)
      } catch {}
    }
    loadPrint()
    return () => { cancelled = true }
  }, [])

  async function choosePlan(planId) {
    setBusy('checkout:' + planId); setErr('')
    try {
      if (sub) {
        // Already subscribed → swap the existing subscription (no double billing).
        const res = await fetch('/api/portal/change-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
          body: JSON.stringify({ planId }),
        })
        if (res.ok) { window.location.reload(); return }
        const data = await res.json().catch(() => ({}))
        setErr(data.error === 'need_address'
          ? 'Add your mailing address in Settings before switching to the Printing Press.'
          : 'Couldn’t change plan.')
      } else {
        // New member → Stripe Checkout creates the subscription.
        const res = await fetch('/api/create-subscription-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, userId: ctx.user.id, successUrl: window.location.href, cancelUrl: window.location.href }),
        })
        const data = await res.json()
        if (res.ok && data.url) { window.location.href = data.url; return }
        setErr('Couldn’t start checkout.')
      }
    } catch { setErr('Something went wrong.') }
    setBusy('')
  }

  async function setCancel(action) {
    if (action === 'cancel' && !window.confirm('Cancel your subscription? You’ll keep access until the end of your current billing period, then billing stops.')) return
    setBusy(action); setErr('')
    try {
      const res = await fetch('/api/portal/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) setSub(s => ({ ...(s || {}), cancel_at_period_end: data.cancel_at_period_end, current_period_end: data.current_period_end }))
      else setErr('Couldn’t update the subscription.')
    } catch { setErr('Something went wrong.') }
    setBusy('')
  }

  async function openBilling() {
    setBusy('billing'); setErr('')
    try {
      const res = await fetch('/api/portal/billing-portal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })
      const data = await res.json()
      if (res.ok && data.url) { window.location.href = data.url; return }
      setErr('Billing portal unavailable — enable the Customer Portal in Stripe settings.')
    } catch { setErr('Something went wrong.') }
    setBusy('')
  }

  const canceling = sub && sub.cancel_at_period_end
  const statusLabel = !hasBilling ? 'No active subscription'
    : canceling ? 'Ending soon'
    : sub ? 'Active' : 'No active subscription'

  return (
    <>
      <style>{fieldCss + extraCss}</style>
      <h1 className="pg-title">Manage subscription</h1>
      <p className="pg-sub">Your membership and billing.</p>

      <div className="pg-card">
        <span className={`pg-pill${planName === 'Free' ? ' muted' : ''}`}>{statusLabel}</span>
        <div className="pg-plan-name">{planName}</div>
        {m.joined_at && (
          <p className="pg-card-note">Member since {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        )}

        {sub && (
          canceling ? (
            <>
              <p className="sub-note">Your plan ends on <strong>{fmtDate(sub.current_period_end)}</strong>. You’ll keep access until then.</p>
              <div className="pg-actions">
                <button className="btn-primary" onClick={() => setCancel('resume')} disabled={busy === 'resume'}>
                  {busy === 'resume' ? 'Resuming…' : 'Resume subscription'}
                </button>
                <button className="btn-text" onClick={openBilling} disabled={busy === 'billing'}>Payment & invoices</button>
              </div>
            </>
          ) : (
            <>
              <p className="sub-note">Renews on <strong>{fmtDate(sub.current_period_end)}</strong>.</p>
              <div className="pg-actions">
                <button className="btn-danger" onClick={() => setCancel('cancel')} disabled={busy === 'cancel'}>
                  {busy === 'cancel' ? 'Canceling…' : 'Cancel subscription'}
                </button>
                <button className="btn-text" onClick={openBilling} disabled={busy === 'billing'}>Payment & invoices</button>
              </div>
            </>
          )
        )}
        {err && <p className="pg-err" style={{ marginTop: 12 }}>{err}</p>}
      </div>

      {print?.subscriber && (
        <div className="pg-card">
          <h2>Print delivery</h2>
          <p className="pg-card-note">Your triannual print issue — when it mails, and where it is now.</p>

          {print.upcoming.length > 0 && print.upcoming.map(u => (
            <div className="pd-upcoming" key={u.id} style={{ marginBottom: 10 }}>
              <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div>
                <div className="pd-upcoming-title">{u.title}{u.issue_number ? ` · ${u.issue_number}` : ''}</div>
                <div className="pd-upcoming-sub">{u.scheduled_mail_date ? `Scheduled to mail ${fmtDay(u.scheduled_mail_date)}` : 'Mail-out date to be announced'}{u.status === 'mailing' ? ' · mailing now' : ''}</div>
              </div>
            </div>
          ))}

          {print.shipments.map(s => (
            <div className="pd-ship" key={s.id}>
              <div className="pd-ship-head">
                <div>
                  <div className="pd-ship-title">{s.issue_title}{s.issue_number ? ` · ${s.issue_number}` : ''}</div>
                  <div className="pd-ship-date">
                    {s.shipped_at ? `Shipped ${fmtDay(s.shipped_at)}` : 'Shipped'}
                    {s.estimated_arrival ? ` · arriving ~${fmtDay(s.estimated_arrival)}` : ''}
                  </div>
                </div>
                <span className="pd-ship-badge">Sent</span>
              </div>
              {(s.tracking_number || s.tracking_url) && (
                <div className="pd-track">
                  <div>
                    <div className="pd-track-label">{s.carrier ? `${s.carrier} tracking` : 'Tracking number'}</div>
                    <div className="pd-track-num">{s.tracking_number || 'Available'}</div>
                  </div>
                  {s.tracking_url && <a className="pd-track-btn" href={s.tracking_url} target="_blank" rel="noopener noreferrer">Track ↗</a>}
                </div>
              )}
            </div>
          ))}

          {print.upcoming.length === 0 && print.shipments.length === 0 && (
            <div className="pd-upcoming">
              <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div>
                <div className="pd-upcoming-title">No issues scheduled yet</div>
                <div className="pd-upcoming-sub">We’ll show your mail-out date and tracking here as soon as the next issue is scheduled.</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pg-card">
        <h2>{sub ? 'Change plan' : 'Choose a membership'}</h2>
        <p className="pg-card-note">Upgrade or start a membership.</p>
        <div className="sub-plans">
          {PLANS.map(p => {
            const isCurrent = m.plan_id === p.id || (m.plan && m.plan.includes(p.label))
            return (
              <div key={p.id} className={`sub-plan${isCurrent ? ' current' : ''}`}>
                {isCurrent && <span className="sub-current-tag">Current plan</span>}
                <div className="sub-plan-name">{p.label}</div>
                <div className="sub-plan-price">{p.price}</div>
                <div className="sub-plan-desc">{p.desc}</div>
                {isCurrent ? (
                  <button className="btn-secondary" disabled>Your plan</button>
                ) : (
                  <button className="btn-primary" onClick={() => choosePlan(p.id)} disabled={busy === 'checkout:' + p.id}>
                    {busy === 'checkout:' + p.id ? 'Starting…' : (sub ? 'Switch to this' : 'Join')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function SubscriptionsPage() {
  return <PortalShell active="subscriptions"><Subscriptions /></PortalShell>
}
