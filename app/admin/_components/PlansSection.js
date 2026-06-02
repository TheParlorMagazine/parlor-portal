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

export default function PlansSection({ supabase, plan: planKey }) {
  const plan = PLAN_DEFS[planKey] || PLAN_DEFS.circle
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ label: plan.label, price: plan.price, desc: plan.desc })

  useEffect(() => {
    setLoading(true)
    supabase.from('members').select('id,name,full_name,email,joined_at,status')
      .in('plan', plan.matchValues)
      .order('joined_at', { ascending: false })
      .then(({ data }) => {
        setMembers(data || [])
        setLoading(false)
      })
  }, [planKey])

  const active  = members.filter(m => !m.status || m.status === 'active').length
  const churned = members.filter(m => m.status === 'churned' || m.status === 'cancelled').length

  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }
  const tdStyle = { padding: '11px 16px', fontSize: '13px', fontFamily: ff, verticalAlign: 'middle' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: 0, letterSpacing: '-0.01em' }}>{plan.label}</h1>
            <span style={{ padding: '3px 10px', background: plan.bg, color: plan.color, borderRadius: '20px', fontSize: '12px', fontWeight: '600', fontFamily: ff }}>{plan.price}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>{plan.desc}</div>
        </div>
        <button onClick={() => setEditing(v => !v)} style={{ padding: '8px 16px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#555', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>
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
          <button style={{ padding: '8px 20px', background: PINK, border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
            Save changes
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
          { label: 'MRR (est.)',        value: `$${(active * parseInt(plan.price.replace(/\D/g, ''), 10)).toLocaleString()}`, color: plan.color },
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {plan.perks.map(p => (
            <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: plan.bg, color: plan.color, borderRadius: '20px', fontSize: '12px', fontFamily: ff }}>
              <span style={{ fontSize: '10px' }}>✓</span> {p}
            </span>
          ))}
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
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const name  = m.name || m.full_name || null
                const email = m.email || null
                const status = m.status || 'active'
                const isActive = !m.status || m.status === 'active'
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
