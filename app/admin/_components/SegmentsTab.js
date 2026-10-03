'use client'

import { useEffect, useState, useRef } from 'react'
import { confirmDialog, alertDialog } from '../../../lib/confirmDialog'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

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

const inp = { padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', width: '100%', background: '#fff' }

// ── New segment form ──────────────────────────────────────────
function NewSegmentForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), description: desc.trim(), filter_type: 'manual' })
    setSaving(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '16px' }}>New Segment</div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Democracy Salons" style={inp} autoFocus />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', color: '#aaa', fontFamily: ff, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What this group is for…" style={inp} />
      </div>
      <div style={{ fontSize: '12px', color: '#aaa', fontFamily: ff, marginBottom: '14px', fontStyle: 'italic' }}>
        New segments are manual — create it, then add members. You can target it in broadcasts and gate a forum to it.
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

// ── Manage members modal ──────────────────────────────────────
function ManageMembersModal({ segment, predefined, token, onClose, onChanged }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [emails, setEmails] = useState('')
  const [fromKey, setFromKey] = useState('')
  const [busy, setBusy] = useState(false)
  const searchTimer = useRef(null)

  async function load() {
    const res = await fetch(`/api/admin/segments/${segment.id}/members`, { headers: { Authorization: `Bearer ${await token()}` } })
    const d = await res.json(); setMembers(d.members || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) { setResults([]); return }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/members/search?q=${encodeURIComponent(q.trim())}`, { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json()
      const have = new Set(members.map(m => m.id))
      setResults((d.members || []).filter(m => !have.has(m.id)))
    }, 250)
  }, [q, members])

  async function add(payload) {
    setBusy(true)
    const res = await fetch(`/api/admin/segments/${segment.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok) { alertDialog(d.error || 'Could not add'); return }
    onChanged?.(d.member_count)
    setQ(''); setResults([]); setEmails(''); setFromKey('')
    await load()
  }

  async function remove(memberId) {
    const res = await fetch(`/api/admin/segments/${segment.id}/members`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ member_id: memberId }),
    })
    const d = await res.json()
    if (res.ok) { onChanged?.(d.member_count); setMembers(ms => ms.filter(m => m.id !== memberId)) }
  }

  const box = { background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '14px' }
  const label = { fontSize: '10px', color: '#aaa', fontFamily: ff, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '620px', padding: '26px 28px', fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div style={{ fontFamily: ffH, fontSize: '22px', fontWeight: '700', color: '#0a0a0a' }}>{segment.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#bbb', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>{members.length} member{members.length === 1 ? '' : 's'}{segment.description ? ` · ${segment.description}` : ''}</div>

        {/* Add controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div style={box}>
            <div style={label}>Add everyone from</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select value={fromKey} onChange={e => setFromKey(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Choose an audience…</option>
                {predefined.map(p => <option key={p.key} value={p.key}>{p.name} ({p.count})</option>)}
              </select>
              <button onClick={() => fromKey && add({ from_predefined: fromKey })} disabled={!fromKey || busy} style={{ padding: '8px 14px', background: fromKey ? PINK : '#eee', border: 'none', borderRadius: '6px', fontFamily: ff, fontSize: '13px', fontWeight: 600, cursor: fromKey ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>Add</button>
            </div>
          </div>
          <div style={box}>
            <div style={label}>Paste emails (comma / newline)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input value={emails} onChange={e => setEmails(e.target.value)} placeholder="a@x.com, b@y.com" style={inp} />
              <button onClick={() => { const list = emails.split(/[\s,;]+/).filter(Boolean); list.length && add({ emails: list }) }} disabled={busy || !emails.trim()} style={{ padding: '8px 14px', background: emails.trim() ? PINK : '#eee', border: 'none', borderRadius: '6px', fontFamily: ff, fontSize: '13px', fontWeight: 600, cursor: emails.trim() ? 'pointer' : 'default' }}>Add</button>
            </div>
          </div>
        </div>

        {/* Search individuals */}
        <div style={{ ...box, marginBottom: '20px' }}>
          <div style={label}>Add individuals</div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…" style={inp} />
          {results.length > 0 && (
            <div style={{ marginTop: '8px', border: '1px solid #eee', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto', background: '#fff' }}>
              {results.map(m => (
                <div key={m.id} onClick={() => add({ member_ids: [m.id] })} style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', fontSize: '13px' }}>
                  <span><strong style={{ color: '#0a0a0a' }}>{m.full_name || '—'}</strong> <span style={{ color: '#aaa' }}>{m.email}</span></span>
                  <span style={{ color: DP, fontWeight: 600 }}>+ Add</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current members */}
        <div style={label}>Members</div>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', maxHeight: '260px', overflowY: 'auto' }}>
          {loading ? <div style={{ padding: '20px', color: '#bbb', fontSize: '13px' }}>Loading…</div>
            : members.length === 0 ? <div style={{ padding: '20px', color: '#ccc', fontSize: '13px', fontStyle: 'italic' }}>No members yet — add some above.</div>
            : members.map((m, i) => (
              <div key={m.id} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i === members.length - 1 ? 'none' : '1px solid #f5f5f5', fontSize: '13px' }}>
                <span><strong style={{ color: '#0a0a0a' }}>{m.full_name || '—'}</strong> <span style={{ color: '#aaa' }}>{m.email}</span>{m.plan && <span style={{ color: '#bbb' }}> · {m.plan}</span>}</span>
                <button onClick={() => remove(m.id)} style={{ background: 'none', border: 'none', color: '#c04040', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>Remove</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ── Main SegmentsTab ──────────────────────────────────────────
export default function SegmentsTab({ supabase }) {
  const [custom, setCustom] = useState([])
  const [predefined, setPredefined] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [deleting, setDeleting] = useState({})
  const [managing, setManaging] = useState(null)

  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/segments', { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json()
      setCustom(d.custom || []); setPredefined(d.predefined || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function createSegment(payload) {
    const res = await fetch('/api/admin/segments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) })
    const d = await res.json()
    if (res.ok && d.segment) setCustom(prev => [d.segment, ...prev])
    setShowNew(false)
  }

  async function deleteSegment(id) {
    if (!(await confirmDialog('Delete this segment? Forums gated to it will lose their audience source.'))) return
    setDeleting(prev => ({ ...prev, [id]: true }))
    await fetch('/api/admin/segments', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id }) })
    setCustom(prev => prev.filter(s => s.id !== id))
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
          <thead><tr><th style={thStyle}>Segment</th><th style={thStyle}>Type</th><th style={thStyle}>Subscribers</th><th style={thStyle}>Description</th></tr></thead>
          <tbody>
            {predefined.map((seg, i) => (
              <tr key={seg.key} style={{ borderBottom: i === predefined.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                <td style={{ ...tdStyle, fontWeight: '500', color: '#0a0a0a', fontSize: '13px' }}>{seg.name}</td>
                <td style={tdStyle}><TypeBadge type={seg.type} /></td>
                <td style={{ ...tdStyle, fontSize: '13px', color: '#333', fontFamily: ffH, fontWeight: '700' }}>{loading ? '…' : (seg.count ?? 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, fontSize: '12px', color: '#888' }}>{seg.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom segments */}
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '10px' }}>Custom Segments ({custom.length})</div>
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
        {custom.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No custom segments yet. Create one (e.g. “Democracy Salons”) and add members.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Type</th><th style={thStyle}>Members</th><th style={thStyle}>Last Updated</th><th style={thStyle}></th></tr></thead>
            <tbody>
              {custom.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i === custom.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                  <td style={{ ...tdStyle, fontWeight: '500', color: '#0a0a0a', fontSize: '13px' }}>
                    {s.name}{s.description && <div style={{ fontSize: '12px', color: '#aaa', fontWeight: '400', marginTop: '1px' }}>{s.description}</div>}
                  </td>
                  <td style={tdStyle}><TypeBadge type={s.filter_type || 'manual'} /></td>
                  <td style={{ ...tdStyle, fontSize: '13px', color: '#333', fontFamily: ffH, fontWeight: '700' }}>{(s.member_count || 0).toLocaleString()}</td>
                  <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>{s.last_updated_at ? new Date(s.last_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {(s.filter_type || 'manual') === 'manual' && (
                      <button onClick={() => setManaging(s)} style={{ padding: '4px 12px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '5px', color: '#333', fontSize: '12px', cursor: 'pointer', fontFamily: ff, marginRight: '6px' }}>Manage</button>
                    )}
                    <button onClick={() => deleteSegment(s.id)} disabled={!!deleting[s.id]} style={{ padding: '4px 10px', background: 'none', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '5px', color: '#c04040', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>{deleting[s.id] ? '…' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {managing && (
        <ManageMembersModal
          segment={managing}
          predefined={predefined}
          token={token}
          onClose={() => setManaging(null)}
          onChanged={(count) => setCustom(prev => prev.map(s => s.id === managing.id ? { ...s, member_count: count, last_updated_at: new Date().toISOString() } : s))}
        />
      )}
    </div>
  )
}
