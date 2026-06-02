'use client'

import { useRef, useState } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

// CSV fields → members table columns
const FIELD_MAP = [
  { key: 'email',     label: 'Email',       required: true },
  { key: 'name',      label: 'Full Name' },
  { key: 'plan',      label: 'Plan' },
  { key: 'joined_at', label: 'Joined Date' },
  { key: 'tags',      label: 'Tags' },
  { key: 'source',    label: 'Source' },
  { key: 'status',    label: 'Status' },
  { key: 'skip',      label: '— Skip this column —' },
]

// Simple CSV parser (handles quoted fields with commas inside)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  function parseLine(line) {
    const fields = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    fields.push(cur.trim())
    return fields
  }
  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

// Try to auto-map a CSV column header to a members field
function autoMap(header) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (h.includes('email'))                           return 'email'
  if (h.includes('name') || h.includes('fullname'))  return 'name'
  if (h.includes('plan') || h.includes('tier'))      return 'plan'
  if (h.includes('join') || h.includes('date') || h.includes('created')) return 'joined_at'
  if (h.includes('tag'))                             return 'tags'
  if (h.includes('source') || h.includes('origin')) return 'source'
  if (h.includes('status'))                          return 'status'
  return 'skip'
}

export default function ImportTab({ supabase }) {
  const fileRef     = useRef(null)
  const [step,      setStep]      = useState('upload')   // upload | map | preview | importing | done
  const [parsed,    setParsed]    = useState(null)        // { headers, rows }
  const [mapping,   setMapping]   = useState({})          // { csvHeader: fieldKey }
  const [importing, setImporting] = useState(false)
  const [progress,  setProgress]  = useState({ done: 0, total: 0, created: 0, updated: 0, skipped: 0 })

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { headers, rows } = parseCSV(ev.target.result)
      const autoMapping = {}
      headers.forEach(h => { autoMapping[h] = autoMap(h) })
      setParsed({ headers, rows })
      setMapping(autoMapping)
      setStep('map')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function getField(row, field) {
    const header = Object.entries(mapping).find(([, v]) => v === field)?.[0]
    if (!header) return null
    const idx = parsed.headers.indexOf(header)
    return idx >= 0 ? row[idx] || null : null
  }

  function buildRecord(row) {
    const email = getField(row, 'email')?.toLowerCase().trim()
    if (!email) return null
    const record = { email }
    const name     = getField(row, 'name')
    const plan     = getField(row, 'plan')
    const joinedAt = getField(row, 'joined_at')
    const tags     = getField(row, 'tags')
    const source   = getField(row, 'source')
    const status   = getField(row, 'status')
    if (name)     record.name = name
    if (plan)     record.plan = plan
    if (joinedAt) { const d = new Date(joinedAt); if (!isNaN(d)) record.joined_at = d.toISOString() }
    if (tags)     record.tags = tags.split(/[;,]/).map(t => t.trim()).filter(Boolean)
    if (source)   record.source = source
    if (status)   record.status = status
    return record
  }

  const emailColMapped = Object.values(mapping).includes('email')
  const preview = parsed?.rows.slice(0, 5).map(r => buildRecord(r)).filter(Boolean) || []

  async function runImport() {
    setImporting(true)
    setStep('importing')
    const records = parsed.rows.map(r => buildRecord(r)).filter(Boolean)
    setProgress({ done: 0, total: records.length, created: 0, updated: 0, skipped: 0 })

    let created = 0, updated = 0, skipped = 0
    const CHUNK = 50
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK)
      for (const rec of chunk) {
        const { data: existing } = await supabase.from('members').select('id').eq('email', rec.email).single()
        if (existing) {
          await supabase.from('members').update(rec).eq('id', existing.id)
          updated++
        } else {
          const { error } = await supabase.from('members').insert({ ...rec, joined_at: rec.joined_at || new Date().toISOString() })
          if (error) { skipped++; continue }
          created++
        }
      }
      const done = Math.min(i + CHUNK, records.length)
      setProgress(p => ({ ...p, done, created, updated, skipped }))
    }

    setProgress({ done: records.length, total: records.length, created, updated, skipped })
    setImporting(false)
    setStep('done')
  }

  const inp = { padding: '7px 11px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '12px', fontFamily: ff, color: '#0a0a0a', outline: 'none', background: '#fff', cursor: 'pointer' }
  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '9px 14px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }
  const tdStyle = { padding: '10px 14px', fontSize: '12px', fontFamily: ff, color: '#444', verticalAlign: 'middle' }

  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
        {[['upload','1. Upload'],['map','2. Map Columns'],['preview','3. Preview'],['importing','4. Import']].map(([s, l], i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {i > 0 && <span style={{ color: '#ddd', fontSize: '12px' }}>→</span>}
            <span style={{ fontSize: '12px', fontFamily: ff, color: step === s ? DP : ['done'].concat(step > s ? [] : []).includes(step) ? '#2d8f5a' : '#bbb', fontWeight: step === s ? '600' : '400' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Upload */}
      {step === 'upload' && (
        <div>
          <div style={{ background: '#fff', border: '2px dashed #e0e0e0', borderRadius: '10px', padding: '48px', textAlign: 'center', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📤</div>
            <div style={{ fontSize: '14px', color: '#555', fontFamily: ff, marginBottom: '6px' }}>Drop a CSV file or click to browse</div>
            <div style={{ fontSize: '12px', color: '#aaa', fontFamily: ff }}>Accepts MailerLite exports or any CSV with email column</div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          <div style={{ marginTop: '16px', padding: '14px 18px', background: '#fffbe6', border: '1px solid #f0e06a', borderRadius: '8px', fontSize: '12px', color: '#7a6000', fontFamily: ff, lineHeight: '1.6' }}>
            <strong>MailerLite export columns supported:</strong> Email, Full Name, Plan, Date Added, Tags, Source, Status
          </div>
        </div>
      )}

      {/* Map columns */}
      {step === 'map' && parsed && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#555', fontFamily: ff, marginBottom: '16px' }}>
              Found <strong>{parsed.rows.length}</strong> rows with <strong>{parsed.headers.length}</strong> columns. Map each CSV column to the correct field:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {parsed.headers.map(h => (
                <div key={h} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                  <span style={{ fontSize: '12px', color: '#bbb' }}>→</span>
                  <select value={mapping[h] || 'skip'} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))} style={{ ...inp, fontSize: '11px' }}>
                    {FIELD_MAP.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          {!emailColMapped && <div style={{ color: '#c04040', fontSize: '12px', fontFamily: ff, marginBottom: '10px' }}>⚠ Map at least one column to "Email" to continue.</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep('preview')} disabled={!emailColMapped} style={{ padding: '9px 20px', background: emailColMapped ? PINK : '#f5f5f5', border: 'none', borderRadius: '7px', color: emailColMapped ? '#0a0a0a' : '#bbb', fontSize: '13px', fontWeight: '600', cursor: emailColMapped ? 'pointer' : 'not-allowed', fontFamily: ff }}>
              Preview Import →
            </button>
            <button onClick={() => { setStep('upload'); setParsed(null) }} style={{ padding: '9px 16px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>Back</button>
          </div>
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && (
        <div>
          <div style={{ fontSize: '13px', color: '#555', fontFamily: ff, marginBottom: '14px' }}>
            Previewing first 5 rows of <strong>{parsed.rows.length}</strong> total. Existing emails will be <strong>updated</strong>, new ones <strong>created</strong>.
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Tags</th>
              </tr></thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < preview.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <td style={tdStyle}>{r.email}</td>
                    <td style={tdStyle}>{r.name || '—'}</td>
                    <td style={tdStyle}>{r.plan || '—'}</td>
                    <td style={tdStyle}>{r.joined_at ? new Date(r.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td style={tdStyle}>{Array.isArray(r.tags) ? r.tags.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={runImport} style={{ padding: '9px 24px', background: PINK, border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
              Import {parsed.rows.length} Subscribers →
            </button>
            <button onClick={() => setStep('map')} style={{ padding: '9px 16px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>Back</button>
          </div>
        </div>
      )}

      {/* Importing */}
      {step === 'importing' && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontFamily: ff, color: '#555', marginBottom: '20px' }}>
            Importing… {progress.done} / {progress.total}
          </div>
          <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ height: '100%', width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`, background: PINK, borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '32px' }}>
          <div style={{ fontSize: '18px', fontFamily: ffH, fontWeight: '700', color: '#0a0a0a', marginBottom: '20px' }}>Import Complete ✓</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Created',  value: progress.created, color: '#2d8f5a' },
              { label: 'Updated',  value: progress.updated, color: '#4a6fd4' },
              { label: 'Skipped',  value: progress.skipped, color: '#888' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f9f9f9', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: s.color, fontFamily: ffH }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px', fontFamily: ff }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { setStep('upload'); setParsed(null); setProgress({ done:0,total:0,created:0,updated:0,skipped:0 }) }}
            style={{ padding: '9px 20px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#555', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
