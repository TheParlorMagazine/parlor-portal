'use client'

import { useEffect, useState } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DARK_PINK = '#c4364a'

const PLAN_DEFS = {
  circle: {
    key:   'circle',
    label: "Reader's Circle",
    price: '$10 / month',
    wixPrice: '$10 / month',   // what Wix-managed (migrated) members actually pay
    matchValues: ["Reader's Circle", 'readers_circle', 'circle', 'readers-circle'],
    color: '#4a6fd4',
    bg:    'rgba(160,180,242,0.1)',
    desc:  'Full digital access — all articles, audio, and exclusive member content.',
    perks: ['Unlimited article access', 'Audio & video content', 'Early access to new issues', 'Member-only newsletter'],
  },
  press: {
    key:   'press',
    label: 'Printing Press',
    price: '$25 / month',
    wixPrice: '$25 / every 4 months',   // what Wix-managed (migrated) members actually pay
    matchValues: ['Printing Press', 'printing_press', 'press', 'print'],
    color: DARK_PINK,
    bg:    'rgba(196,54,74,0.08)',
    desc:  'Everything in Reader\'s Circle, plus the quarterly print magazine mailed to your door.',
    perks: ['Everything in Reader\'s Circle', 'Quarterly print magazine', 'Free shipping', 'Inaugural subscriber gift'],
  },
}

const inputStyle = {
  padding: '8px 12px', background: '#fff', border: '1px solid #e0e0e0',
  borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a',
  outline: 'none', boxSizing: 'border-box', width: '100%',
}
const textareaStyle = { ...inputStyle, resize: 'vertical', lineHeight: '1.5' }

// Estimate a plan's MONTHLY price from its free-text label, normalizing the
// billing period so MRR is comparable across plans:
//   "$10 / month" → 10 · "$30 / every 4 months" → 7.5 · "$120 / year" → 10
function monthlyPrice(priceStr) {
  const s = String(priceStr || '')
  const amount = parseFloat((s.match(/[\d.,]+/) || ['0'])[0].replace(/,/g, '')) || 0
  const every = s.match(/every\s+(\d+)\s*month/i)
  let months = 1
  if (every) months = parseInt(every[1], 10) || 1
  else if (/year|annual/i.test(s)) months = 12
  else if (/quarter/i.test(s)) months = 3
  else if (/week/i.test(s)) months = 1 / 4.345   // ~4.345 weeks per month
  return months > 0 ? amount / months : amount
}

export default function PlansSection({ supabase, plan: planKey }) {
  const plan = PLAN_DEFS[planKey] || PLAN_DEFS.circle
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  // editable plan display data (falls back to static defaults until loaded)
  const [data, setData] = useState({ label: plan.label, price: plan.price, description: plan.desc, perks: plan.perks })
  const [draft, setDraft] = useState({ label: plan.label, price: plan.price, desc: plan.desc })
  const [newPerk, setNewPerk] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  async function token() { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${await token()}` } })
        const d = await res.json()
        const row = (d.plans || []).find(p => p.key === plan.key)
        if (row && !cancelled) { setData({ label: row.label, price: row.price, description: row.description, perks: row.perks || [] }); setDraft({ label: row.label, price: row.price, desc: row.description }) }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [planKey])

  async function savePlan(patch) {
    const res = await fetch('/api/admin/plans', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ key: plan.key, ...patch }) })
    const d = await res.json()
    if (res.ok && d.plan) setData({ label: d.plan.label, price: d.plan.price, description: d.plan.description, perks: d.plan.perks || [] })
    return res.ok
  }
  async function saveDetails() {
    setSavingDetails(true)
    await savePlan({ label: draft.label, price: draft.price, description: draft.desc })
    setSavingDetails(false); setEditing(false)
  }
  async function addPerk() {
    const v = newPerk.trim(); if (!v) return
    setNewPerk('')
    await savePlan({ perks: [...data.perks, v] })
  }
  async function removePerk(i) {
    await savePlan({ perks: data.perks.filter((_, idx) => idx !== i) })
  }

  useEffect(() => {
    setLoading(true)
    const full = 'id,full_name,email,joined_at,subscription_status,billing_source,stripe_subscription_id,stripe_customer_id'
    const base = 'id,full_name,email,joined_at,subscription_status'
    supabase.from('members').select(full).in('plan', plan.matchValues).order('joined_at', { ascending: false })
      .then(async ({ data, error }) => {
        // Fall back if the billing columns aren't deployed yet (pre-migration).
        if (error) {
          const r = await supabase.from('members').select(base).in('plan', plan.matchValues).order('joined_at', { ascending: false })
          setMembers(r.data || [])
        } else setMembers(data || [])
        setLoading(false)
      })
  }, [planKey])

  const active  = members.filter(m => !m.subscription_status || m.subscription_status === 'active').length
  const churned = members.filter(m => m.subscription_status === 'churned' || m.subscription_status === 'cancelled').length

  // MRR uses each member's REAL price: Wix-managed migrations pay the Wix rate,
  // everyone else the in-app (display) price.
  const mrr = members
    .filter(m => !m.subscription_status || m.subscription_status === 'active')
    .reduce((sum, m) => sum + monthlyPrice(m.billing_source === 'wix' ? (plan.wixPrice || data.price) : data.price), 0)
  const wixCount = members.filter(m => m.billing_source === 'wix').length

  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }
  const tdStyle = { padding: '11px 16px', fontSize: '13px', fontFamily: ff, verticalAlign: 'middle' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: 0, letterSpacing: '-0.01em' }}>{data.label}</h1>
            <span style={{ padding: '3px 10px', background: plan.bg, color: plan.color, borderRadius: '20px', fontSize: '12px', fontWeight: '600', fontFamily: ff }}>{data.price}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>{data.description}</div>
        </div>
        <button onClick={() => { if (!editing) setDraft({ label: data.label, price: data.price, desc: data.description }); setEditing(v => !v) }} style={{ padding: '8px 16px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#555', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>
          {editing ? 'Cancel' : 'Edit plan'}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '16px' }}>Edit Plan Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Plan Name</div>
              <input style={inputStyle} value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Price</div>
              <input style={inputStyle} value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</div>
            <textarea rows={3} style={textareaStyle} value={draft.desc} onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))} />
          </div>
          <button onClick={saveDetails} disabled={savingDetails} style={{ padding: '8px 20px', background: PINK, border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
            {savingDetails ? 'Saving…' : 'Save changes'}
          </button>
          <div style={{ fontSize: '11px', color: '#bbb', fontFamily: ff, marginTop: '10px', fontStyle: 'italic' }}>Note: plan name and price changes apply to display only — update your payment processor separately.</div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Subscribers', value: members.length },
          { label: 'Active',            value: active, color: '#2d8f5a' },
          { label: 'Churned',           value: churned, color: '#c04040' },
          { label: 'MRR (est.)',        value: `$${Math.round(mrr).toLocaleString()}`, color: plan.color },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color || '#0a0a0a', fontFamily: ffH, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '5px', fontFamily: ff, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Perks */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '16px 18px', marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '12px' }}>Plan Includes</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {data.perks.length === 0 && <span style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic' }}>No benefits yet — add one below.</span>}
          {data.perks.map((p, i) => (
            <span key={`${p}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 8px 5px 12px', background: plan.bg, color: plan.color, borderRadius: '20px', fontSize: '12px', fontFamily: ff }}>
              <span style={{ fontSize: '10px' }}>✓</span> {p}
              <button onClick={() => removePerk(i)} title="Remove" style={{ background: 'none', border: 'none', color: plan.color, cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '0 2px', opacity: 0.6 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '440px' }}>
          <input value={newPerk} onChange={e => setNewPerk(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPerk() }} placeholder="Add a benefit…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addPerk} disabled={!newPerk.trim()} style={{ padding: '8px 16px', background: '#0a0a0a', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff, whiteSpace: 'nowrap' }}>Add</button>
        </div>
      </div>

      {/* Subscriber list */}
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '10px' }}>
        Subscribers ({loading ? '…' : members.length})
      </div>
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No subscribers on this plan yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Subscriber</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Billing</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const name  = m.name || m.full_name || null
                const email = m.email || null
                const status   = m.subscription_status || 'active'
                const isActive = !m.subscription_status || m.subscription_status === 'active'
                const onWix    = m.billing_source === 'wix'
                const hasStripe = !!(m.stripe_subscription_id || m.stripe_customer_id)
                return (
                  <tr key={m.id} style={{ borderBottom: i === members.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '500', color: '#0a0a0a' }}>{name || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}</div>
                      <div style={{ fontSize: '12px', color: '#aaa' }}>{email || m.id.slice(0, 20) + '…'}</div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {onWix && (
                          <span title="Subscription is billed through Wix, not Stripe" style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontFamily: ff, background: '#eef0f2', color: '#5a6472' }}>
                            Managed on Wix
                          </span>
                        )}
                        {hasStripe && (
                          <span title="A Stripe subscription is connected" style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontFamily: ff, background: 'rgba(99,91,255,0.1)', color: '#635bff' }}>
                            ✓ Stripe
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontFamily: ff, background: isActive ? 'rgba(110,201,154,0.1)' : 'rgba(224,112,112,0.08)', color: isActive ? '#2d8f5a' : '#c04040' }}>
                        {status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
