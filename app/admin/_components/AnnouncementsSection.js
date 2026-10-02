'use client'

import { useEffect, useState, useRef } from 'react'
import { prepareImageUpload, isDuplicateUpload } from '../../../lib/uploadImage'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'
const DP = '#c4364a'
const PINK = '#f2b8c6'

const input = { width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '14px 0 6px' }

const TYPES = [
  { value: 'issue', label: 'Issue launch' },
  { value: 'event', label: 'Event' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'general', label: 'General' },
]
const TYPE_COLOR = { issue: '#7a2531', event: '#2d6ca8', fundraiser: '#2d8f5a', campaign: '#a8642d', general: '#666' }

function toLocalInput(iso) { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

function AnnouncementModal({ token, item, supabase, defaultPlacement = 'ribbon', onClose, onSaved }) {
  const [f, setF] = useState({
    kicker: item?.kicker || '', headline: item?.headline || '', message: item?.message || '',
    cta_label: item?.cta_label || '', cta_href: item?.cta_href || '', type: item?.type || 'general',
    active: item?.active ?? true, sort: item?.sort ?? 0,
    starts_at: toLocalInput(item?.starts_at), ends_at: toLocalInput(item?.ends_at),
    placement: item?.placement || defaultPlacement, image_url: item?.image_url || '',
  })
  const isHome = f.placement === 'homepage'
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dedupeRef = useRef(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  async function uploadHero(file) {
    if (!file || !file.type.startsWith('image/')) return
    if (!supabase) { setMsg('Upload unavailable — paste a URL instead.'); return }
    if (isDuplicateUpload(dedupeRef, file)) return
    setUploading(true); setMsg(null)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim: 2000 })
      const path = `announcements/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (error) { setMsg('Upload failed — paste a URL instead.'); return }
      const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path)
      set('image_url', publicUrl)
    } finally { setUploading(false) }
  }

  async function save() {
    if (!f.kicker.trim() && !f.headline.trim() && !f.message.trim()) { setMsg('Add at least a kicker, headline, or message.'); return }
    setBusy(true); setMsg(null)
    const payload = {
      ...f,
      sort: Number(f.sort) || 0,
      starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
    }
    if (item?.id) payload.id = item.id
    const res = await fetch('/api/admin/announcements', { method: item?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) })
    setBusy(false)
    if (res.ok) { onSaved(); onClose() } else { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Could not save.') }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 620, maxWidth: '96vw', padding: 26, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: ffH, fontSize: 22, fontWeight: 700 }}>{item?.id ? 'Edit' : 'New'} {isHome ? 'homepage banner' : 'ribbon announcement'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: '#888', margin: '0 0 6px' }}>
          {isHome ? 'A large banner on the public homepage — eyebrow + header + description + hero image.' : 'Shown in the floating footer ribbon. Active ones rotate in order.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
          <div><div style={label}>Type</div>
            <select value={f.type} onChange={e => set('type', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><div style={label}>Sort</div><input type="number" value={f.sort} onChange={e => set('sort', e.target.value)} style={input} /></div>
        </div>

        <div style={label}>Kicker <span style={{ textTransform: 'none', letterSpacing: 0 }}>(small eyebrow line)</span></div>
        <input value={f.kicker} onChange={e => set('kicker', e.target.value)} placeholder="Our second issue is here" style={input} />
        <div style={label}>Headline</div>
        <input value={f.headline} onChange={e => set('headline', e.target.value)} placeholder="Join us as it unfolds" style={input} />
        <div style={label}>{f.placement === 'homepage' ? 'Description' : 'Message'}</div>
        <textarea value={f.message} onChange={e => set('message', e.target.value)} rows={2} placeholder="Sustain the work and receive full access…" style={{ ...input, resize: 'vertical' }} />

        {f.placement === 'homepage' && (
          <>
            <div style={label}>Hero image</div>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const fl = e.dataTransfer.files?.[0]; if (fl) uploadHero(fl) }}
              style={{ border: `1.5px dashed ${drag ? DP : BORDER}`, borderRadius: 8, background: drag ? '#fdf1f3' : '#faf8f6', padding: f.image_url ? 8 : 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              {f.image_url
                ? <><img src={f.image_url} alt="" style={{ width: 96, height: 54, borderRadius: 5, objectFit: 'cover', flexShrink: 0, background: '#eee' }} /><div style={{ fontSize: 12, color: '#888', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.image_url}</div><button onClick={() => set('image_url', '')} style={{ background: 'none', border: 'none', color: DP, fontSize: 12.5, cursor: 'pointer', fontFamily: ff }}>Remove</button></>
                : <div style={{ fontSize: 12.5, color: '#888' }}>{uploading ? 'Uploading…' : <><strong style={{ color: '#555' }}>Drag &amp; drop</strong> a wide hero image, or <label style={{ color: DP, cursor: 'pointer' }}>upload<input type="file" accept="image/*" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) uploadHero(fl); e.target.value = '' }} /></label></>}</div>}
            </div>
            <input value={f.image_url} onChange={e => set('image_url', e.target.value)} placeholder="…or paste a hero image URL" style={{ ...input, marginTop: 8, fontSize: 13 }} />
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><div style={label}>Button label</div><input value={f.cta_label} onChange={e => set('cta_label', e.target.value)} placeholder="Become a paid subscriber" style={input} /></div>
          <div><div style={label}>Button link</div><input value={f.cta_href} onChange={e => set('cta_href', e.target.value)} placeholder="/plans" style={input} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><div style={label}>Show from <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div><input type="datetime-local" value={f.starts_at} onChange={e => set('starts_at', e.target.value)} style={input} /></div>
          <div><div style={label}>Show until <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div><input type="datetime-local" value={f.ends_at} onChange={e => set('ends_at', e.target.value)} style={input} /></div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '16px 0 4px', fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!f.active} onChange={e => set('active', e.target.checked)} style={{ width: 15, height: 15, accentColor: '#0a0a0a', cursor: 'pointer' }} />
          Active (shows on the site)
        </label>

        {msg && <p style={{ color: DP, fontSize: 13, marginTop: 12 }}>{msg}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 18px', fontFamily: ff, fontSize: 13, cursor: 'pointer', color: '#555' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save announcement'}</button>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementsSection({ supabase }) {
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(undefined) // undefined=closed, null=new, obj=edit
  const [tab, setTab] = useState('ribbon') // 'ribbon' | 'homepage'

  const shown = items.filter(a => (tab === 'homepage' ? a.placement === 'homepage' : (a.placement || 'ribbon') !== 'homepage'))

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements', { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json(); setItems(d.announcements || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function toggleActive(a) {
    await fetch('/api/admin/announcements', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: a.id, active: !a.active }) })
    load()
  }
  async function del(id) {
    if (!confirm('Delete this announcement?')) return
    await fetch('/api/admin/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div style={{ fontFamily: ff }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: 30, fontWeight: 700, margin: 0 }}>Announcements</h1>
          <p style={{ color: '#777', fontSize: 14, margin: '4px 0 0' }}>{tab === 'homepage'
            ? 'Large hero banners on the public homepage — eyebrow, header, description, and a hero image.'
            : 'The floating footer ribbon — issue launches, events, fundraisers, and campaigns. Active ones rotate in sort order.'}</p>
        </div>
        <button onClick={() => setEditing(null)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New {tab === 'homepage' ? 'banner' : 'ribbon item'}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${BORDER}`, marginBottom: 4 }}>
        {[['ribbon', 'Footer ribbon'], ['homepage', 'Hero banner']].map(([v, l]) => {
          const count = items.filter(a => (v === 'homepage' ? a.placement === 'homepage' : (a.placement || 'ribbon') !== 'homepage')).length
          const on = tab === v
          return (
            <button key={v} onClick={() => setTab(v)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${on ? '#0a0a0a' : 'transparent'}`, padding: '9px 4px', marginBottom: -1, fontFamily: ff, fontSize: 14, fontWeight: on ? 700 : 500, color: on ? '#1a1a1a' : '#999', cursor: 'pointer' }}>
              {l}{count ? <span style={{ color: '#bbb', fontWeight: 400 }}> · {count}</span> : ''}
            </button>
          )
        })}
      </div>

      {loading ? <p style={{ color: '#888', marginTop: 24 }}>Loading…</p> : shown.length === 0 ? (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#faf8f6', padding: 30, textAlign: 'center', color: '#888', marginTop: 20 }}>{tab === 'homepage' ? 'No homepage banners yet. Add one above.' : 'No ribbon announcements yet. Add one above.'}</div>
      ) : (
        <div style={{ marginTop: 20, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          {shown.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i ? `1px solid ${BORDER}` : 'none', background: a.active ? '#fff' : '#fafafa' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff', background: TYPE_COLOR[a.type] || '#666', borderRadius: 20, padding: '3px 9px', flexShrink: 0 }}>{a.type}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: ffH, fontSize: 15, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.kicker || a.headline || a.message || '(untitled)'}</div>
                <div style={{ fontSize: 12.5, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[a.headline, a.message].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <span style={{ fontSize: 11.5, color: '#aaa', flexShrink: 0 }}>sort {a.sort}</span>
              <button onClick={() => toggleActive(a)} title={a.active ? 'Active — click to hide' : 'Hidden — click to show'} style={{ flexShrink: 0, cursor: 'pointer', border: `1px solid ${a.active ? '#2d8f5a' : BORDER}`, background: a.active ? '#e8f6ee' : '#fff', color: a.active ? '#2d8f5a' : '#999', borderRadius: 20, padding: '4px 12px', fontFamily: ff, fontSize: 12 }}>{a.active ? 'Active' : 'Hidden'}</button>
              <button onClick={() => setEditing(a)} style={{ flexShrink: 0, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: ff }}>Edit</button>
              <button onClick={() => del(a.id)} style={{ flexShrink: 0, background: 'none', border: '1px solid rgba(224,112,112,0.25)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: ff, color: '#c04040' }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {editing !== undefined && <AnnouncementModal token={token} item={editing} defaultPlacement={tab} supabase={supabase} onClose={() => setEditing(undefined)} onSaved={load} />}
    </div>
  )
}
