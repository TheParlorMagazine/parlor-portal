'use client'

import { useEffect, useState, useRef } from 'react'

// ── Style tokens (light theme) ────────────────────────────────
const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const pink = '#f2b8c6'
const darkPink = '#c4364a'

const inputStyle = {
  padding: '8px 12px', background: '#fff',
  border: '1px solid #e0e0e0', borderRadius: '6px',
  fontSize: '13px', fontFamily: ff, color: '#0a0a0a',
  outline: 'none', boxSizing: 'border-box',
}

const PLAN_OPTIONS = ['all', 'free', 'paid', 'print']
const STATUS_OPTIONS = ['all', 'active', 'churned', 'cancelled']

function planColor(plan) {
  if (plan === 'paid') return { bg: 'rgba(110,201,154,0.12)', color: '#2d8f5a' }
  if (plan === 'print') return { bg: 'rgba(160,180,242,0.12)', color: '#4a6fd4' }
  return { bg: '#f5f5f5', color: '#888' }
}

function statusColor(status) {
  if (status === 'active') return { bg: 'rgba(110,201,154,0.1)', color: '#2d8f5a' }
  if (status === 'churned' || status === 'cancelled') return { bg: 'rgba(224,112,112,0.1)', color: '#c04040' }
  return { bg: '#f5f5f5', color: '#888' }
}

function Badge({ text, style: s }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '500', fontFamily: ff, ...s,
    }}>
      {text}
    </span>
  )
}

// ── Subscriber Profile Modal ──────────────────────────────────
function SubscriberProfile({ member, onClose, onUpdate, supabase }) {
  const [tab, setTab] = useState('overview')
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState(member.notes || '')
  const [savingNote, setSavingNote] = useState(false)
  const [timeline, setTimeline] = useState([])

  useEffect(() => {
    // Build synthetic timeline from available data
    const events = []
    if (member.created_at) events.push({ date: member.created_at, event: 'Signed up', detail: member.plan ? `${member.plan} plan` : '' })
    if (member.role) events.push({ date: member.updated_at || member.created_at, event: 'Role assigned', detail: member.role })
    if (member.onboarding_sent_at) events.push({ date: member.onboarding_sent_at, event: 'Onboarding email sent', detail: '' })
    if (member.first_article_read_at) events.push({ date: member.first_article_read_at, event: 'First article read', detail: '' })
    if (member.upgraded_at) events.push({ date: member.upgraded_at, event: 'Upgraded to paid', detail: '' })
    events.sort((a, b) => new Date(b.date) - new Date(a.date))
    setTimeline(events)

    // Try fetching events from table
    supabase.from('member_events').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data?.length) {
          const dbEvents = data.map(e => ({ date: e.created_at, event: e.event_type || e.type || 'Event', detail: e.detail || e.description || '' }))
          setTimeline(prev => {
            const merged = [...dbEvents, ...prev]
            merged.sort((a, b) => new Date(b.date) - new Date(a.date))
            return merged
          })
        }
      })
  }, [member.id])

  async function saveNote() {
    if (!note.trim()) return
    setSavingNote(true)
    const combined = notes ? `${notes}\n\n${new Date().toLocaleDateString('en-US')}: ${note}` : `${new Date().toLocaleDateString('en-US')}: ${note}`
    await supabase.from('members').update({ notes: combined }).eq('id', member.id)
    setNotes(combined)
    setNote('')
    onUpdate({ ...member, notes: combined })
    setSavingNote(false)
  }

  const displayName = member.name || member.full_name || member.display_name || null
  const displayEmail = member.email || null
  const plan = member.plan || member.subscription_plan || null
  const status = member.status || member.subscription_status || 'active'
  const planC = planColor(plan)
  const statusC = statusColor(status)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '560px', background: '#fff', height: '100%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          fontFamily: ff,
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontFamily: ffH, fontSize: '18px', fontWeight: '700', color: '#0a0a0a' }}>
                  {displayName || 'Subscriber'}
                </span>
                {plan && <Badge text={plan} style={planC} />}
                <Badge text={status} style={statusC} />
              </div>
              <div style={{ fontSize: '13px', color: '#777' }}>
                {displayEmail || `ID: ${member.id}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#bbb', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0' }}>
            {[['overview','Overview'],['timeline','Timeline'],['print','Print']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '10px 18px', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: ff, fontSize: '13px',
                  color: tab === key ? darkPink : '#888',
                  borderBottom: tab === key ? `2px solid ${darkPink}` : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {tab === 'overview' && (
            <div>
              {/* Key info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Member since', value: member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—' },
                  { label: 'Plan', value: plan || 'Free' },
                  { label: 'Status', value: status },
                  { label: 'Last active', value: member.last_active || member.last_sign_in_at ? new Date(member.last_active || member.last_sign_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                  { label: 'Onboarding sent', value: member.onboarding_sent ? 'Yes' : member.onboarding_sent_at ? 'Yes' : '—' },
                  { label: 'Last page visited', value: member.last_page || member.last_visited_page || '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f9f9f9', borderRadius: '7px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '13px', color: '#0a0a0a' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', marginBottom: '10px' }}>Actions</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Upgrade plan', color: '#2d8f5a', bg: 'rgba(110,201,154,0.1)', border: 'rgba(110,201,154,0.3)' },
                    { label: 'Downgrade plan', color: '#888', bg: '#f5f5f5', border: '#e0e0e0' },
                    { label: 'Cancel subscription', color: '#c04040', bg: 'rgba(224,112,112,0.08)', border: 'rgba(224,112,112,0.2)' },
                    { label: 'Issue refund', color: '#4a6fd4', bg: 'rgba(160,180,242,0.1)', border: 'rgba(160,180,242,0.3)' },
                    { label: 'Remove subscriber', color: '#c04040', bg: 'rgba(224,112,112,0.06)', border: 'rgba(224,112,112,0.15)' },
                  ].map(({ label, color, bg, border }) => (
                    <button key={label} type="button" style={{ padding: '7px 14px', background: bg, border: `1px solid ${border}`, borderRadius: '6px', color, fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', marginBottom: '10px' }}>Notes</div>
                {notes && (
                  <div style={{ background: '#f9f9f9', borderRadius: '7px', padding: '12px 14px', marginBottom: '10px', fontSize: '13px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {notes}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveNote()}
                    placeholder="Add a note…"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={saveNote} disabled={!note.trim() || savingNote} style={{ padding: '8px 16px', background: pink, border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
                    {savingNote ? '…' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'timeline' && (
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '16px', fontStyle: 'italic' }}>
                Subscriber journey milestones
              </div>
              {timeline.length === 0 && (
                <div style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic', padding: '24px 0' }}>No events recorded yet.</div>
              )}
              {timeline.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: '16px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pink, border: '2px solid #fff', boxShadow: `0 0 0 2px ${pink}`, marginTop: '2px' }} />
                    {i < timeline.length - 1 && <div style={{ width: '1px', flex: 1, background: '#f0e8e0', minHeight: '24px', marginTop: '4px' }} />}
                  </div>
                  <div style={{ paddingBottom: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#0a0a0a', fontWeight: '500' }}>{ev.event}</div>
                    {ev.detail && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{ev.detail}</div>}
                    <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px' }}>
                      {ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'print' && (
            <div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px', fontStyle: 'italic' }}>
                Print subscription fulfillment details
              </div>
              {member.plan !== 'print' && !member.print_address ? (
                <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '20px', fontSize: '13px', color: '#aaa', textAlign: 'center', fontStyle: 'italic' }}>
                  This subscriber is not on a print plan.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', marginBottom: '10px' }}>Mailing Address</div>
                    <div style={{ background: '#f9f9f9', borderRadius: '7px', padding: '14px', fontSize: '13px', color: '#444', lineHeight: '1.6' }}>
                      {member.print_address || member.address || <span style={{ color: '#bbb', fontStyle: 'italic' }}>No address on file</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Subscription start', value: member.print_start_date ? new Date(member.print_start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
                      { label: 'Issues sent', value: member.issues_sent ?? '—' },
                      { label: 'Issues pending', value: member.issues_pending ?? '—' },
                      { label: 'Last issue mailed', value: member.last_issue_mailed ? new Date(member.last_issue_mailed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f9f9f9', borderRadius: '7px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '13px', color: '#0a0a0a' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => window.print()}
                    style={{ padding: '9px 20px', background: '#0a0a0a', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}
                  >
                    Print fulfillment sheet
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Subscribers Section ──────────────────────────────────
export default function SubscribersSection({ supabase }) {
  const [all, setAll] = useState([])       // all non-team members
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [profileId, setProfileId] = useState(null)

  const TEAM_ROLES = ['admin', 'editor', 'writer', 'finance_admin', 'social_admin']

  useEffect(() => {
    supabase.from('members').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setAll((data || []).filter(m => !m.role || !TEAM_ROLES.includes(m.role)))
      setLoading(false)
    })
  }, [])

  const filtered = all.filter(m => {
    const search_ = search.toLowerCase()
    const matchSearch = !search_ ||
      (m.email || '').toLowerCase().includes(search_) ||
      (m.name || m.full_name || '').toLowerCase().includes(search_) ||
      m.id.toLowerCase().includes(search_)
    const plan = m.plan || m.subscription_plan || 'free'
    const status = m.status || m.subscription_status || 'active'
    const matchPlan = filterPlan === 'all' || plan === filterPlan
    const matchStatus = filterStatus === 'all' || status === filterStatus
    return matchSearch && matchPlan && matchStatus
  })

  function toggleSelect(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function toggleAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(m => m.id)))
  }

  function exportCSV() {
    const rows = [
      ['ID', 'Name', 'Email', 'Plan', 'Status', 'Joined', 'Last Active', 'Onboarding Sent'],
      ...filtered.filter(m => selected.size === 0 || selected.has(m.id)).map(m => [
        m.id,
        m.name || m.full_name || '',
        m.email || '',
        m.plan || m.subscription_plan || 'free',
        m.status || m.subscription_status || 'active',
        m.created_at ? new Date(m.created_at).toLocaleDateString('en-US') : '',
        m.last_active ? new Date(m.last_active).toLocaleDateString('en-US') : '',
        m.onboarding_sent || m.onboarding_sent_at ? 'Yes' : 'No',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const profileMember = profileId ? all.find(m => m.id === profileId) : null
  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', background: '#fafafa', fontWeight: '500' }
  const tdStyle = { padding: '12px 12px', fontSize: '13px', color: '#444', fontFamily: ff, verticalAlign: 'middle' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Subscribers</h1>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>
            {loading ? '…' : `${all.length} total · ${all.filter(m => (m.plan || 'free') === 'paid').length} paid`}
          </div>
        </div>
        <button onClick={exportCSV} style={{ padding: '9px 18px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#444', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>
          {selected.size > 0 ? `Export ${selected.size} selected` : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or ID…"
          style={{ ...inputStyle, width: '280px' }}
        />
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p === 'all' ? 'All plans' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', background: 'rgba(242,184,198,0.08)', border: '1px solid rgba(242,184,198,0.2)', borderRadius: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: '#c4364a', fontFamily: ff, marginRight: '8px' }}>{selected.size} selected</span>
          <button onClick={exportCSV} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontFamily: ff, color: '#444' }}>Export CSV</button>
          <button style={{ padding: '6px 14px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontFamily: ff, color: '#444' }}>Send email</button>
          <button style={{ padding: '6px 14px', background: 'rgba(224,112,112,0.08)', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontFamily: ff, color: '#c04040' }}>Cancel subscriptions</button>
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#aaa', fontFamily: ff }}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#bbb', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#bbb', fontFamily: ff, fontStyle: 'italic' }}>No subscribers found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '36px' }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: '#c4364a' }} />
                </th>
                <th style={thStyle}>Subscriber</th>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Last Active</th>
                <th style={thStyle}>Onboarding</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const plan = m.plan || m.subscription_plan || 'free'
                const status = m.status || m.subscription_status || 'active'
                const planC = planColor(plan)
                const statusC = statusColor(status)
                const displayName = m.name || m.full_name || m.display_name || null
                const displayEmail = m.email || null
                const isLast = i === filtered.length - 1
                return (
                  <tr
                    key={m.id}
                    style={{ borderBottom: isLast ? 'none' : '1px solid #f5f5f5', cursor: 'pointer' }}
                    onClick={() => setProfileId(m.id)}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...tdStyle, width: '36px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} style={{ accentColor: '#c4364a' }} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '500', color: '#0a0a0a' }}>{displayName || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}</div>
                      <div style={{ fontSize: '12px', color: '#aaa', marginTop: '1px' }}>{displayEmail || m.id.slice(0, 16) + '…'}</div>
                    </td>
                    <td style={tdStyle}><Badge text={plan} style={planC} /></td>
                    <td style={tdStyle}><Badge text={status} style={statusC} /></td>
                    <td style={{ ...tdStyle, fontSize: '12px' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>
                      {m.last_active ? new Date(m.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px' }}>
                      {m.onboarding_sent || m.onboarding_sent_at
                        ? <span style={{ color: '#2d8f5a' }}>✓ Sent</span>
                        : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setProfileId(m.id)}
                        style={{ padding: '5px 12px', background: 'none', border: '1px solid #e8e8e8', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontFamily: ff, color: '#888' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {profileMember && (
        <SubscriberProfile
          member={profileMember}
          supabase={supabase}
          onClose={() => setProfileId(null)}
          onUpdate={updated => setAll(prev => prev.map(m => m.id === updated.id ? updated : m))}
        />
      )}
    </div>
  )
}
