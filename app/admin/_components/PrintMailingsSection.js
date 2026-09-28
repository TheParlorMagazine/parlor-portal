'use client'

import { useEffect, useState } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'
const DP = '#c4364a'

const input = { width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 7, fontFamily: ff, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '0 0 5px' }

const STATUS_META = {
  scheduled: { label: 'Scheduled', bg: '#fff4e5', color: '#9a6a1a' },
  mailing:   { label: 'Mailing',   bg: '#e8f0fe', color: '#2c5fb3' },
  sent:      { label: 'Sent',      bg: '#e7f6ec', color: '#2d7a4a' },
}
function fmtDay(iso) { if (!iso) return '—'; const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

function NewIssueModal({ token, onClose, onSaved }) {
  const [f, setF] = useState({ title: '', issue_number: '', scheduled_mail_date: '', cover_image_url: '' })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  async function save() {
    if (!f.title.trim()) { setMsg('Title is required.'); return }
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/print-mailings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(f) })
    setBusy(false)
    if (res.ok) { onSaved(); onClose() } else { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Could not save.') }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 480, maxWidth: '96vw', padding: 24, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: ffH, fontSize: 21, fontWeight: 700 }}>New print issue</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <div style={label}>Title</div><input value={f.title} onChange={e => set('title', e.target.value)} placeholder="Vol. 2 — Winter 2026" style={input} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div><div style={label}>Issue no.</div><input value={f.issue_number} onChange={e => set('issue_number', e.target.value)} placeholder="No. 4" style={input} /></div>
          <div><div style={label}>Scheduled mail date</div><input type="date" value={f.scheduled_mail_date} onChange={e => set('scheduled_mail_date', e.target.value)} style={input} /></div>
        </div>
        <div style={{ marginTop: 12 }}><div style={label}>Cover image URL (optional)</div><input value={f.cover_image_url} onChange={e => set('cover_image_url', e.target.value)} style={input} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
          {msg && <span style={{ fontSize: 12.5, color: DP, alignSelf: 'center' }}>{msg}</span>}
          <button onClick={save} disabled={busy} style={{ padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontFamily: ff, fontSize: 13.5, cursor: 'pointer' }}>{busy ? 'Creating…' : 'Create issue'}</button>
        </div>
      </div>
    </div>
  )
}

function ShipmentRow({ ship, token, issueTitle, onChanged }) {
  const [f, setF] = useState({ carrier: ship.carrier || '', tracking_number: ship.tracking_number || '', tracking_url: ship.tracking_url || '', estimated_arrival: ship.estimated_arrival || '' })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const shipped = ship.status === 'shipped'

  async function save(markShipped) {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/print-mailings/shipments', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id: ship.id, ...f, status: markShipped ? 'shipped' : undefined }),
    })
    setBusy(false)
    if (res.ok) { const d = await res.json(); setMsg(markShipped ? (d.emailed ? 'Shipped · emailed ✓' : 'Shipped ✓') : 'Saved ✓'); onChanged() }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Error') }
  }

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{ship.member_name || ship.member_email || 'Member'}</div>
          <div style={{ fontSize: 11.5, color: '#999', whiteSpace: 'pre-line' }}>{ship.member_address || <span style={{ color: DP }}>No mailing address on file</span>}</div>
        </div>
        <span style={{ flex: '0 0 auto', height: 'fit-content', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 999, background: shipped ? '#e7f6ec' : '#f3eef0', color: shipped ? '#2d7a4a' : '#999' }}>{shipped ? 'Shipped' : 'Pending'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 120px', gap: 8 }}>
        <div><div style={label}>Carrier</div><input value={f.carrier} onChange={e => set('carrier', e.target.value)} placeholder="USPS" style={input} /></div>
        <div><div style={label}>Tracking #</div><input value={f.tracking_number} onChange={e => set('tracking_number', e.target.value)} style={input} /></div>
        <div><div style={label}>Tracking URL</div><input value={f.tracking_url} onChange={e => set('tracking_url', e.target.value)} style={input} /></div>
        <div><div style={label}>Est. arrival</div><input type="date" value={f.estimated_arrival || ''} onChange={e => set('estimated_arrival', e.target.value)} style={input} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <button onClick={() => save(false)} disabled={busy} style={{ padding: '7px 14px', background: 'none', color: '#333', border: `1px solid ${BORDER}`, borderRadius: 7, fontFamily: ff, fontSize: 12.5, cursor: 'pointer' }}>Save</button>
        {!shipped && <button onClick={() => save(true)} disabled={busy} style={{ padding: '7px 14px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 7, fontFamily: ff, fontSize: 12.5, cursor: 'pointer' }}>Mark shipped &amp; email</button>}
        {shipped && ship.notified_at && <span style={{ fontSize: 12, color: '#2d7a4a' }}>Buyer emailed</span>}
        {msg && <span style={{ fontSize: 12, color: msg.includes('✓') ? '#2d7a4a' : DP }}>{msg}</span>}
      </div>
    </div>
  )
}

function IssueDetail({ issue, token, onChanged }) {
  const [ships, setShips] = useState(null)
  const [gen, setGen] = useState(null) // last generate result
  const [busy, setBusy] = useState('')
  const [bulk, setBulk] = useState({ carrier: '', estimated_arrival: '' })

  async function loadShips() {
    const res = await fetch(`/api/admin/print-mailings/shipments?issue_id=${issue.id}`, { headers: { Authorization: `Bearer ${await token()}` } })
    if (res.ok) { const d = await res.json(); setShips(d.shipments || []) } else setShips([])
  }
  useEffect(() => { loadShips() }, [issue.id])

  async function generate() {
    setBusy('gen')
    const res = await fetch('/api/admin/print-mailings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ action: 'generate', issue_id: issue.id }) })
    setBusy('')
    if (res.ok) { setGen(await res.json()); loadShips(); onChanged() }
  }

  async function shipAll() {
    if (!window.confirm('Mark every pending copy shipped and email those subscribers?')) return
    setBusy('shipall')
    const res = await fetch('/api/admin/print-mailings/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ action: 'ship_all', issue_id: issue.id, carrier: bulk.carrier || undefined, estimated_arrival: bulk.estimated_arrival || undefined }) })
    setBusy('')
    if (res.ok) { loadShips(); onChanged() }
  }

  const pending = (ships || []).filter(s => s.status === 'pending').length

  return (
    <div style={{ padding: '4px 16px 18px', borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '14px 0' }}>
        <button onClick={generate} disabled={busy === 'gen'} style={{ padding: '8px 14px', background: '#fff', color: '#333', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 12.5, cursor: 'pointer' }}>
          {busy === 'gen' ? 'Generating…' : 'Generate shipments for subscribers'}
        </button>
        {gen && <span style={{ fontSize: 12.5, color: '#666' }}>Added {gen.added} · {gen.total} subscribers{gen.missingAddress ? ` · ${gen.missingAddress} missing address` : ''}</span>}
      </div>

      {ships === null && <div style={{ color: '#999', fontSize: 13, padding: 8 }}>Loading shipments…</div>}
      {ships !== null && ships.length === 0 && (
        <div style={{ color: '#999', fontSize: 13, padding: '10px 4px' }}>No shipments yet. Generate them for the current print subscribers, then add tracking below.</div>
      )}

      {ships !== null && ships.length > 0 && (
        <>
          <div style={{ background: '#faf7f8', border: `1px solid ${BORDER}`, borderRadius: 9, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 110px' }}><div style={label}>Carrier (all)</div><input value={bulk.carrier} onChange={e => setBulk(b => ({ ...b, carrier: e.target.value }))} placeholder="USPS" style={input} /></div>
            <div style={{ flex: '0 0 140px' }}><div style={label}>Est. arrival (all)</div><input type="date" value={bulk.estimated_arrival} onChange={e => setBulk(b => ({ ...b, estimated_arrival: e.target.value }))} style={input} /></div>
            <button onClick={shipAll} disabled={busy === 'shipall' || pending === 0} style={{ padding: '9px 16px', background: pending ? '#0a0a0a' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontFamily: ff, fontSize: 13, cursor: pending ? 'pointer' : 'default' }}>
              {busy === 'shipall' ? 'Shipping…' : `Ship all pending & email (${pending})`}
            </button>
            <span style={{ fontSize: 11.5, color: '#999', flexBasis: '100%' }}>Applies carrier/arrival only to copies that don’t already have them. Per-subscriber tracking numbers go in each row below.</span>
          </div>
          {ships.map(s => <ShipmentRow key={s.id} ship={s} token={token} issueTitle={issue.title} onChanged={() => { loadShips(); onChanged() }} />)}
        </>
      )}
    </div>
  )
}

function IssueCard({ issue, token, onChanged }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const sm = STATUS_META[issue.status] || STATUS_META.scheduled
  const set = async (patch) => { setBusy(true); await fetch('/api/admin/print-mailings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: issue.id, ...patch }) }); setBusy(false); onChanged() }
  async function remove() { if (!window.confirm(`Delete "${issue.title}" and its shipments?`)) return; setBusy(true); await fetch(`/api/admin/print-mailings?id=${issue.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } }); setBusy(false); onChanged() }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 11, marginBottom: 12, background: '#fff', overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{issue.title}{issue.issue_number ? <span style={{ color: '#aaa', fontWeight: 400 }}> · {issue.issue_number}</span> : null}</div>
          <div style={{ fontSize: 12, color: '#999' }}>Mail date {fmtDay(issue.scheduled_mail_date)} · {issue.counts.shipped}/{issue.counts.total} shipped</div>
        </div>
        <span style={{ flex: '0 0 auto', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 11px', borderRadius: 999, background: sm.bg, color: sm.color }}>{sm.label}</span>
        <span style={{ flex: '0 0 auto', color: '#bbb', fontSize: 13 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#888' }}>Status:</span>
            {['scheduled', 'mailing', 'sent'].map(st => (
              <button key={st} onClick={() => set({ status: st })} disabled={busy} style={{ padding: '4px 11px', border: `1px solid ${issue.status === st ? '#0a0a0a' : BORDER}`, background: issue.status === st ? '#0a0a0a' : '#fff', color: issue.status === st ? '#fff' : '#555', borderRadius: 999, fontSize: 11.5, cursor: 'pointer', fontFamily: ff }}>{STATUS_META[st].label}</button>
            ))}
            <button onClick={remove} disabled={busy} style={{ marginLeft: 'auto', padding: '4px 11px', background: 'none', color: DP, border: `1px solid #e2b4b4`, borderRadius: 7, fontSize: 11.5, cursor: 'pointer', fontFamily: ff }}>Delete issue</button>
          </div>
          <IssueDetail issue={issue} token={token} onChanged={onChanged} />
        </>
      )}
    </div>
  )
}

export default function PrintMailingsSection({ supabase }) {
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
  const [issues, setIssues] = useState(null)
  const [subCount, setSubCount] = useState(0)
  const [creating, setCreating] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/print-mailings', { headers: { Authorization: `Bearer ${await token()}` } })
    if (res.ok) { const d = await res.json(); setIssues(d.issues || []); setSubCount(d.subscriberCount || 0) } else setIssues([])
  }
  useEffect(() => { load() }, [])

  return (
    <div style={{ fontFamily: ff, padding: '4px 4px 40px', maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: 27, fontWeight: 700, margin: 0 }}>Print mailings</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>Schedule print issues, add tracking, and notify subscribers · {subCount} active print subscriber{subCount === 1 ? '' : 's'}.</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: '10px 18px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontFamily: ff, fontSize: 13.5, cursor: 'pointer' }}>+ New issue</button>
      </div>

      <div style={{ marginTop: 22 }}>
        {issues === null && <div style={{ color: '#999', fontSize: 14, padding: 20 }}>Loading…</div>}
        {issues !== null && issues.length === 0 && (
          <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 12, padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>No print issues yet. Create one to schedule a mail-out.</div>
        )}
        {(issues || []).map(i => <IssueCard key={i.id} issue={i} token={token} onChanged={load} />)}
      </div>

      {creating && <NewIssueModal token={token} onClose={() => setCreating(false)} onSaved={load} />}
    </div>
  )
}
