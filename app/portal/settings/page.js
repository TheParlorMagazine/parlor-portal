'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell, { usePortal } from '../_components/PortalShell'
import { fieldCss } from '../_components/formCss'

const CARD_LABEL = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express',
  discover: 'Discover', diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay',
}
function cardLabel(brand) { return CARD_LABEL[brand] || (brand ? brand[0].toUpperCase() + brand.slice(1) : 'Card') }
const WALLET_LABEL = { apple_pay: 'Apple Pay', google_pay: 'Google Pay', link: 'Link', samsung_pay: 'Samsung Pay' }

// A human title for any saved method — card, wallet, or PayPal.
function methodTitle(m) {
  if (m.type === 'paypal') return 'PayPal'
  if (m.wallet && WALLET_LABEL[m.wallet]) return `${WALLET_LABEL[m.wallet]} · ${cardLabel(m.brand)}`
  return cardLabel(m.brand)
}

const pmCss = `
  .pm-list { display:flex; flex-direction:column; gap:10px; }
  .pm-row { display:flex; align-items:center; gap:14px; border:1px solid var(--border); border-radius:10px; padding:14px 16px; background:#fff; }
  .pm-card-icon { flex:0 0 auto; color:#8a6b72; }
  .pm-card-icon svg { width:34px; height:auto; display:block; }
  .pm-info { display:flex; flex-direction:column; gap:3px; }
  .pm-brand { font-size:14px; font-weight:600; color:var(--ink,#000); display:flex; align-items:center; gap:8px; }
  .pm-dots { font-weight:500; letter-spacing:0.04em; color:#333; }
  .pm-default { font-size:10px; letter-spacing:0.06em; text-transform:uppercase; background:#000; color:#fff; padding:2px 8px; border-radius:999px; }
  .pm-exp { font-size:12.5px; color:var(--muted,#888); }
`

function Settings() {
  const ctx = usePortal()
  const supabase = createClient()
  const currentEmail = ctx?.user?.email || ''

  const [email, setEmail] = useState(currentEmail)
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null) // {ok, text}
  const [editingPw, setEditingPw] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [news, setNews] = useState(!!ctx?.member?.newsletter_subscribed)
  const [savedPI, setSavedPI] = useState({
    mailing_address: ctx?.member?.mailing_address || '',
    phone: ctx?.member?.phone || '',
  })
  const [pi, setPi] = useState(savedPI)
  const [editingPI, setEditingPI] = useState(false)
  const [piMsg, setPiMsg] = useState(null)
  const [busy, setBusy] = useState('')
  const [pm, setPm] = useState(undefined) // undefined=loading, {hasBilling, methods}
  const [pmErr, setPmErr] = useState('')
  const [pmMsg, setPmMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadPm() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/portal/payment-methods', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (!cancelled) setPm(res.ok ? data : { hasBilling: false, methods: [] })
      } catch { if (!cancelled) setPm({ hasBilling: false, methods: [] }) }
    }
    loadPm()
    // Returning from the Stripe "save a card" flow — confirm + clean the URL.
    try {
      if (new URLSearchParams(window.location.search).get('saved') === '1') {
        setPmMsg('Payment method saved ✓')
        window.history.replaceState(null, '', window.location.pathname)
      }
    } catch {}
    return () => { cancelled = true }
  }, [])

  async function manageBilling() {
    setBusy('billing'); setPmErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/portal/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })
      const data = await res.json()
      if (res.ok && data.url) { window.location.href = data.url; return }
      setPmErr('Billing portal unavailable — enable the Customer Portal in Stripe settings.')
    } catch { setPmErr('Something went wrong.') }
    setBusy('')
  }

  // Save a new payment method (card / Apple Pay / Google Pay / PayPal) with no
  // purchase required — opens Stripe's setup checkout.
  async function saveNewMethod() {
    setBusy('setup'); setPmErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/portal/setup-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ returnUrl: window.location.href.split('?')[0] }),
      })
      const data = await res.json()
      if (res.ok && data.url) { window.location.href = data.url; return }
      setPmErr('Couldn’t start — please try again.')
    } catch { setPmErr('Something went wrong.') }
    setBusy('')
  }

  function startEdit() { setPi(savedPI); setPiMsg(null); setEditingPI(true) }
  function cancelEdit() { setPi(savedPI); setPiMsg(null); setEditingPI(false) }

  async function savePersonal() {
    setBusy('pi'); setPiMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(pi),
      })
      if (res.ok) { setSavedPI(pi); setEditingPI(false); setPiMsg({ ok: true, text: 'Saved ✓' }) }
      else setPiMsg({ ok: false, text: 'Couldn’t save.' })
    } catch { setPiMsg({ ok: false, text: 'Couldn’t save.' }) }
    setBusy('')
  }

  async function changeEmail() {
    if (!email.trim() || email.trim() === currentEmail) return
    setBusy('email'); setEmailMsg(null)
    const { error } = await supabase.auth.updateUser({ email: email.trim() })
    if (error) setEmailMsg({ ok: false, text: error.message })
    else { setEmailMsg({ ok: true, text: 'Check your inbox to confirm the new address.' }); setEditingEmail(false) }
    setBusy('')
  }

  function startPwEdit() { setCurPw(''); setPw(''); setPw2(''); setPwMsg(null); setEditingPw(true) }
  function cancelPwEdit() { setCurPw(''); setPw(''); setPw2(''); setPwMsg(null); setEditingPw(false) }

  async function changePassword() {
    if (!curPw) { setPwMsg({ ok: false, text: 'Enter your current password.' }); return }
    if (pw.length < 8) { setPwMsg({ ok: false, text: 'Use at least 8 characters.' }); return }
    if (pw !== pw2) { setPwMsg({ ok: false, text: 'Passwords don’t match.' }); return }
    setBusy('pw'); setPwMsg(null)
    // Verify the current password by re-authenticating before allowing a change.
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: currentEmail, password: curPw })
    if (verifyErr) { setPwMsg({ ok: false, text: 'Current password is incorrect.' }); setBusy(''); return }
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setPwMsg({ ok: false, text: error.message })
    else { cancelPwEdit(); setPwMsg({ ok: true, text: 'Password updated.' }) }
    setBusy('')
  }

  async function forgotPassword() {
    setBusy('forgot'); setPwMsg(null)
    try {
      await fetch('/api/auth/send-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail }),
      })
      setPwMsg({ ok: true, text: `Reset link sent to ${currentEmail}.` })
    } catch { setPwMsg({ ok: false, text: 'Couldn’t send the reset email.' }) }
    setBusy('')
  }

  async function toggleNews() {
    const next = !news
    setNews(next)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ newsletter_subscribed: next }),
    }).catch(() => setNews(!next))
  }

  return (
    <>
      <style>{fieldCss + pmCss}</style>
      <h1 className="pg-title">Settings</h1>
      <p className="pg-sub">Manage your account and preferences.</p>

      <div className="pg-card">
        <div className="pi-head">
          <h2>Personal information</h2>
          {!editingPI && (
            <button className="pi-edit" onClick={startEdit} aria-label="Edit personal information" title="Edit">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" strokeLinejoin="round"/></svg>
              Edit
            </button>
          )}
        </div>
        <p className="pg-card-note">Private — used for print &amp; store deliveries and account contact only. Never shown publicly.</p>

        {!editingPI ? (
          <>
            <div className="pg-row"><div className="pg-row-label">Phone<small>{savedPI.phone || 'Not added yet'}</small></div></div>
            <div className="pg-row"><div className="pg-row-label">Mailing address<small style={{ whiteSpace: 'pre-line' }}>{savedPI.mailing_address || 'Not added yet'}</small></div></div>
          </>
        ) : (
          <>
            <label className="fld">
              <span>Phone</span>
              <input type="tel" value={pi.phone} onChange={e => { setPi(p => ({ ...p, phone: e.target.value })); setPiMsg(null) }} placeholder="Optional" />
            </label>
            <label className="fld">
              <span>Mailing address <em>· for print issues &amp; store orders</em></span>
              <textarea rows={3} value={pi.mailing_address} onChange={e => { setPi(p => ({ ...p, mailing_address: e.target.value })); setPiMsg(null) }} placeholder="Street, city, postal code, country" />
            </label>
            <div className="pg-actions">
              <button className="btn-primary" onClick={savePersonal} disabled={busy === 'pi'}>{busy === 'pi' ? 'Saving…' : 'Save'}</button>
              <button className="btn-text" onClick={cancelEdit} disabled={busy === 'pi'}>Cancel</button>
            </div>
          </>
        )}
        {piMsg && <span className={piMsg.ok ? 'pg-ok' : 'pg-err'} style={{ display: 'inline-block', marginTop: 10 }}>{piMsg.text}</span>}
      </div>

      <div className="pg-card">
        <div className="pi-head">
          <h2>Email address</h2>
          {!editingEmail && (
            <button className="pi-edit" onClick={() => { setEmail(currentEmail); setEmailMsg(null); setEditingEmail(true) }} aria-label="Edit email" title="Edit">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" strokeLinejoin="round"/></svg>
              Edit
            </button>
          )}
        </div>
        <p className="pg-card-note">Changing this sends a confirmation link to the new address.</p>

        {!editingEmail ? (
          <div className="pg-row"><div className="pg-row-label">Email<small>{currentEmail}</small></div></div>
        ) : (
          <>
            <label className="fld">
              <span>Email</span>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailMsg(null) }} />
            </label>
            <div className="pg-actions">
              <button className="btn-primary" onClick={changeEmail} disabled={busy === 'email' || email.trim() === currentEmail}>
                {busy === 'email' ? 'Sending…' : 'Update email'}
              </button>
              <button className="btn-text" onClick={() => { setEmail(currentEmail); setEmailMsg(null); setEditingEmail(false) }} disabled={busy === 'email'}>Cancel</button>
            </div>
          </>
        )}
        {emailMsg && <span className={emailMsg.ok ? 'pg-ok' : 'pg-err'} style={{ display: 'inline-block', marginTop: 10 }}>{emailMsg.text}</span>}
      </div>

      <div className="pg-card">
        <div className="pi-head">
          <h2>Password</h2>
          {!editingPw && (
            <button className="pi-edit" onClick={startPwEdit} aria-label="Change password" title="Change password">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" strokeLinejoin="round"/></svg>
              Change
            </button>
          )}
        </div>
        <p className="pg-card-note">Set a new password for signing in.</p>

        {!editingPw ? (
          <div className="pg-row"><div className="pg-row-label">Password<small>••••••••</small></div></div>
        ) : (
          <>
            <label className="fld"><span>Current password</span>
              <input type="password" value={curPw} onChange={e => { setCurPw(e.target.value); setPwMsg(null) }} placeholder="Your current password" />
            </label>
            <label className="fld"><span>New password</span>
              <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwMsg(null) }} placeholder="At least 8 characters" />
            </label>
            <label className="fld"><span>Confirm new password</span>
              <input type="password" value={pw2} onChange={e => { setPw2(e.target.value); setPwMsg(null) }} />
            </label>
            <div className="pg-actions">
              <button className="btn-primary" onClick={changePassword} disabled={busy === 'pw'}>
                {busy === 'pw' ? 'Saving…' : 'Update password'}
              </button>
              <button className="btn-text" onClick={cancelPwEdit} disabled={busy === 'pw'}>Cancel</button>
            </div>
            <button className="pw-forgot" onClick={forgotPassword} disabled={busy === 'forgot'}>
              {busy === 'forgot' ? 'Sending…' : 'Forgot my password?'}
            </button>
          </>
        )}
        {pwMsg && <span className={pwMsg.ok ? 'pg-ok' : 'pg-err'} style={{ display: 'inline-block', marginTop: 10 }}>{pwMsg.text}</span>}
      </div>

      <div className="pg-card">
        <div className="pi-head">
          <h2>Payment methods</h2>
          {pm?.methods?.length > 0 && (
            <button className="pi-edit" onClick={saveNewMethod} disabled={busy === 'setup'} title="Add a payment method">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
              Add
            </button>
          )}
        </div>
        <p className="pg-card-note">Save a card, Apple Pay, Google Pay, or PayPal — no membership needed. Whatever you use for a purchase or membership is saved here too. For your security, we never store the numbers; entry &amp; changes happen in Stripe’s secure checkout.</p>

        {pm === undefined ? (
          <div className="pg-row"><div className="pg-row-label"><small>Loading…</small></div></div>
        ) : !pm.hasBilling || pm.methods.length === 0 ? (
          <>
            <div className="pg-row"><div className="pg-row-label">On file<small>No payment method saved yet.</small></div></div>
            <div className="pg-actions">
              <button className="btn-primary" onClick={saveNewMethod} disabled={busy === 'setup'}>{busy === 'setup' ? 'Opening…' : 'Set a payment method'}</button>
            </div>
          </>
        ) : (
          <>
            <div className="pm-list">
              {pm.methods.map(m => (
                <div key={m.id} className="pm-row">
                  <div className="pm-card-icon">
                    {m.type === 'paypal'
                      ? <svg viewBox="0 0 24 16" fill="none"><rect x="0.5" y="0.5" width="23" height="15" rx="2.5" stroke="currentColor"/><path d="M8 11l1.2-6h3.3c1.6 0 2.4.9 2.1 2.3-.3 1.6-1.6 2.4-3.3 2.4h-1.1L11 11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg viewBox="0 0 24 16" fill="none"><rect x="0.5" y="0.5" width="23" height="15" rx="2.5" stroke="currentColor"/><path d="M0 4.5h24" stroke="currentColor" strokeWidth="2"/></svg>}
                  </div>
                  <div className="pm-info">
                    <div className="pm-brand">{methodTitle(m)} {m.type === 'paypal'
                      ? (m.paypal_email && <span className="pm-dots">{m.paypal_email}</span>)
                      : <span className="pm-dots">•••• {m.last4}</span>}{m.isDefault && <span className="pm-default">Default</span>}</div>
                    {m.type !== 'paypal' && m.exp_month && m.exp_year && <div className="pm-exp">Expires {String(m.exp_month).padStart(2, '0')}/{String(m.exp_year).slice(-2)}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="pg-actions" style={{ marginTop: 14 }}>
              <button className="btn-secondary" onClick={saveNewMethod} disabled={busy === 'setup'}>{busy === 'setup' ? 'Opening…' : 'Add another'}</button>
              <button className="btn-text" onClick={manageBilling} disabled={busy === 'billing'}>{busy === 'billing' ? 'Opening…' : 'Manage in Stripe'}</button>
            </div>
          </>
        )}
        {pmMsg && <span className="pg-ok" style={{ display: 'inline-block', marginTop: 10 }}>{pmMsg}</span>}
        {pmErr && <span className="pg-err" style={{ display: 'inline-block', marginTop: 10 }}>{pmErr}</span>}
      </div>

      <div className="pg-card">
        <h2>Preferences</h2>
        <div className="pg-row">
          <div className="pg-row-label">Newsletter<small>Occasional updates from The Parlor.</small></div>
          <button className={`pg-toggle${news ? ' on' : ''}`} onClick={toggleNews} aria-label="Toggle newsletter" />
        </div>
      </div>
    </>
  )
}

export default function SettingsPage() {
  return <PortalShell active="settings"><Settings /></PortalShell>
}
