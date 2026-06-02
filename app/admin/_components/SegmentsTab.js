'use client'

import { useEffect, useState } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

// Predefined automatic segments — counts calculated from members table
const PREDEFINED = [
  { key: 'plan_free',      name: 'Free Plan',             type: 'plan',     filter: { plan: ['free', null] },             desc: 'Subscribers on the free plan' },
  { key: 'plan_circle',    name: "Reader's Circle",       type: 'plan',     filter: { plan: ["Reader's Circle",'circle'] }, desc: '$10/mo digital subscribers' },
  { key: 'plan_press',     name: 'Printing Press',        type: 'plan',     filter: { plan: ['Printing Press','press','print'] }, desc: '$25/mo print + digital subscribers' },
  { key: 'new_30d',        name: 'Signed Up (30 days)',   type: 'behavior', filter: { days: 30 },                         desc: 'Joined in the last 30 days' },
  { key: 'high_engage',    name: 'Highly Engaged',        type: 'engagement', filter: { minScore: 20 },                   desc: 'Engagement score ≥ 20' },
  { key: 'low_engage',     name: 'At-Risk',               type: 'engagement', filter: { maxScore: 5 },                    desc: 'Engagement score ≤ 5' },
  { key: 'unsubscribed',   name: 'Unsubscribed',          type: 'status',   filter: { status: 'unsubscribed' },           desc: 'Opted out of emails' },
]

const TYPE_COLORS = {
  plan:       { color: '#4a6fd4', bg: 'rgba(160,180,242,0.12)' },
  behavior:   { color: '#d4844a', bg: 'rgba(242,196,110,0.12)' },
  engagement: { color: '#8a4ad4', bg: 'rgba(200,160,242,0.12)' },
  status:     { color: '#c04040', bg: 'rgba(224,112,112,0.1)' },
  manual:     { color: '#2d8f5a', bg: 'rgba(110,201,154,0.1)' },
  source:     { color: DP,        bg: 'rgba(196,54,74,0.08)' },
}

function TypeBadge({ type }) {
  const s = TYPE_COLORS[type] || TYPE_COLORS.manual
  return <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontFamily: ff, fontWeight: '500', textTransform: 'capitalize', background: s.bg, color: s.color }}>{type}</span>
}

// ── New segment form ──────────────────────────────────────────
function NewSegmentForm({ onSave, onCancel }) {
  const [name,       setName]       = useState('')
  const [desc,       setDesc]       = useState('')
  const [filterType, setFilterType] = useState('manual')
  const [saving,     setSaving]     = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), description: desc.trim(), filter_type: filterType, filter_config: {}, member_count: 0 })
    setSaving(false)
  }

  const inp = { padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', width: '100%', background: '#fff' }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '16px' }}>New Segment</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Segment name…" style={inp} autoFocus />
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Type</div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="manual">Manual (add members manually)</option>
            <option value="plan">By Plan</option>
            <option value="source">By Source</option>
            <option value="behavior">By Behavior</option>
            <option value="engagement">By Engagement Score</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this segment includes…" style={inp} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSave} disabled={!name.trim() || saving} style={{ padding: '8px 20px', background: PINK, border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: ff, opacity: name.trim() ? 1 : 0.5 }}>
          {saving ? 'Creating…' : 'Create Segment'}
        </button>
        <button onClick={onCancel} style={{ padding: '8px 16px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main SegmentsTab ──────────────────────────────────────────
export default function SegmentsTab({ supabase }) {
  const [segments,    setSegments]    = useState([])
  const [predCounts,  setPredCounts]  = useState({})
  const [loading,     setLoading]     = useState(true)
  const [showNew,     setShowNew]     = useState(false)
  const [deleting,    setDeleting]    = useState({})

  useEffect(() => {
    supabase.from('email_segments').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setSegments(data || [])
    })

    // Calculate predefined segment counts from members table
    Promise.allSettled([
      supabase.from('members').select('id', { count: 'exact' }).or('plan.is.null,plan.eq.free'),
      supabase.from('members').select('id', { count: 'exact' }).in('plan', ["Reader's Circle", 'circle']),
      supabase.from('members').select('id', { count: 'exact' }).in('plan', ['Printing Press', 'press', 'print']),
      supabase.from('members').select('id', { count: 'exact' }).gte('joined_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from('members').select('id', { count: 'exact' }).gte('engagement_score', 20),
      supabase.from('members').select('id', { count: 'exact' }).lte('engagement_score', 5),
      supabase.from('members').select('id', { count: 'exact' }).eq('status', 'unsubscribed'),
    ]).then(results => {
      const keys = ['plan_free','plan_circle','plan_press','new_30d','high_engage','low_engage','unsubscribed']
      const counts = {}
      results.forEach((r, i) => {
        counts[keys[i]] = r.status === 'fulfilled' ? (r.value.count ?? 0) : 0
      })
      setPredCounts(counts)
      setLoading(false)
    })
  }, [])

  async function createSegment(data) {
    const now = new Date().toISOString()
    const { data: d } = await supabase.from('email_segments').insert({ ...data, created_at: now, last_updated_at: now }).select().single()
    if (d) setSegments(prev => [d, ...prev])
    setShowNew(false)
  }

  async function deleteSegment(id) {
    if (!window.confirm('Delete this segment?')) return
    setDeleting(prev => ({ ...prev, [id]: true }))
    await supabase.from('email_segments').delete().eq('id', id)
    setSegments(prev => prev.filter(s => s.id !== id))
    setDeleting(prev => ({ ...prev, [id]: false }))
  }

  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }
  const tdStyle = { padding: '13px 16px', fontFamily: ff, verticalAlign: 'middle' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
        <button onClick={() => setShowNew(v => !v)} style={{ padding: '8px 18px', background: showNew ? '#f5f5f5' : PINK, border: 'none', borderRadius: '7px', color: showNew ? '#555' : '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
          {showNew ? 'Cancel' : '+ New Segment'}
        </button>
      </div>

      {showNew && <NewSegmentForm onSave={createSegment} onCancel={() => setShowNew(false)} />}

      {/* Predefined segments */}
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '10px' }}>Automatic Segments</div>
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={thStyle}>Segment</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Subscribers</th>
            <th style={thStyle}>Description</th>
          </tr></thead>
          <tbody>
            {PREDEFINED.map((seg, i) => (
              <tr key={seg.key} style={{ borderBottom: i === PREDEFINED.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                <td style={{ ...tdStyle, fontWeight: '500', color: '#0a0a0a', fontSize: '13px' }}>{seg.name}</td>
                <td style={tdStyle}><TypeBadge type={seg.type} /></td>
                <td style={{ ...tdStyle, fontSize: '13px', color: '#333', fontFamily: ffH, fontWeight: '700' }}>
                  {loading ? '…' : (predCounts[seg.key] ?? 0).toLocaleString()}
                </td>
                <td style={{ ...tdStyle, fontSize: '12px', color: '#888' }}>{seg.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom segments */}
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '10px' }}>Custom Segments ({segments.length})</div>
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
        {segments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No custom segments yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Subscribers</th>
              <th style={thStyle}>Last Updated</th>
              <th style={thStyle}></th>
            </tr></thead>
            <tbody>
              {segments.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i === segments.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                  <td style={{ ...tdStyle, fontWeight: '500', color: '#0a0a0a', fontSize: '13px' }}>
                    {s.name}
                    {s.description && <div style={{ fontSize: '12px', color: '#aaa', fontWeight: '400', marginTop: '1px' }}>{s.description}</div>}
                  </td>
                  <td style={tdStyle}><TypeBadge type={s.filter_type || 'manual'} /></td>
                  <td style={{ ...tdStyle, fontSize: '13px', color: '#333', fontFamily: ffH, fontWeight: '700' }}>{(s.member_count || 0).toLocaleString()}</td>
                  <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>
                    {s.last_updated_at ? new Date(s.last_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button onClick={() => deleteSegment(s.id)} disabled={!!deleting[s.id]} style={{ padding: '4px 10px', background: 'none', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '5px', color: '#c04040', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>
                      {deleting[s.id] ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
