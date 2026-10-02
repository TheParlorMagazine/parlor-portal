'use client'

import { useEffect, useState, useRef } from 'react'
import { prepareImageUpload, isDuplicateUpload } from '../../../lib/uploadImage'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const BORDER = '#e5e0e2'
const DP = '#c4364a'

const input = { width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '14px 0 6px' }
function toLocal(iso) { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

// On-brand dropdown for the forum mode (matches the form inputs; "+" on create).
function ForumModeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const opts = [
    { v: 'none', label: 'No discussion forum' },
    { v: 'create', label: 'Create a new forum for this event', plus: true },
    { v: 'connect', label: 'Connect to an existing forum' },
  ]
  const cur = opts.find(o => o.v === value) || opts[0]
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ ...input, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
        <span style={{ color: cur.plus ? '#7a2531' : '#1a1a1a', fontWeight: cur.plus ? 600 : 400 }}>{cur.plus ? '+ ' : ''}{cur.label}</span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M2.5 4.5L6 8l3.5-3.5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(26,23,16,0.14)', zIndex: 20, overflow: 'hidden' }}>
          {opts.map(o => (
            <div key={o.v} onClick={() => { onChange(o.v); setOpen(false) }}
              style={{ padding: '10px 13px', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: value === o.v ? '#faf3f5' : '#fff', color: o.plus ? '#7a2531' : '#333', fontWeight: o.plus ? 600 : 400 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5eef1'}
              onMouseLeave={e => e.currentTarget.style.background = value === o.v ? '#faf3f5' : '#fff'}>
              {o.plus && <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>+</span>}
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Forum thumbnail: paste a URL, click to upload, or drag & drop an image.
function ForumImageField({ value, onChange, supabase }) {
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const dedupeRef = useRef(null)

  async function uploadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    if (isDuplicateUpload(dedupeRef, file)) return
    setUploading(true)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim: 1200 })
      const path = `forums/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path); onChange(publicUrl) }
    } finally { setUploading(false) }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f) }}
        onClick={() => !value && fileRef.current?.click()}
        style={{ position: 'relative', border: `1.5px dashed ${drag ? DP : BORDER}`, borderRadius: 8, background: drag ? '#faf3f5' : '#fafafa', padding: value ? 8 : 18, display: 'flex', alignItems: 'center', gap: 12, cursor: value ? 'default' : 'pointer', transition: 'border-color 0.15s, background 0.15s' }}>
        {value ? (
          <>
            <img src={value} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#eee' }} />
            <div style={{ fontSize: 12.5, color: '#666', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            <button type="button" onClick={e => { e.stopPropagation(); onChange('') }} style={{ background: 'none', border: 'none', color: DP, fontSize: 13, cursor: 'pointer', fontFamily: ff, flexShrink: 0 }}>Remove</button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#999', fontFamily: ff }}>
            {uploading ? 'Uploading…' : <><strong style={{ color: '#555' }}>Drag &amp; drop</strong> an image here, or <span style={{ color: DP }}>click to upload</span></>}
          </div>
        )}
        {uploading && value && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#666', borderRadius: 8 }}>Uploading…</div>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
      </div>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="…or paste an image URL (defaults to the event cover)" style={{ ...input, marginTop: 8, fontSize: 13 }} />
    </div>
  )
}

function EventModal({ token, event, onClose, onSaved, forums = [], supabase }) {
  const [f, setF] = useState({
    title: event?.title || '', blurb: event?.blurb || '', description: event?.description || '', cover_image_url: event?.cover_image_url || '',
    location_type: event?.location_type || 'virtual', location: event?.location || '', join_url: event?.join_url || '',
    starts_at: toLocal(event?.starts_at), ends_at: toLocal(event?.ends_at), capacity: event?.capacity ?? '',
    status: event?.status || 'draft', host_name: event?.host_name || '',
    forum_mode: event?.forum_id ? 'connect' : 'none',   // none | create | connect
    forum_id: event?.forum_id || '',
    forum_name: '',   // custom name when creating a new forum (blank = use the event name)
    forum_cover: '',  // custom forum thumbnail (blank = inherit the event cover)
    featured_in_newsletter: !!event?.featured_in_newsletter,
    featured_home: !!event?.featured_home,
  })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const hadForum = !!event?.forum_id

  async function save() {
    if (!f.title.trim()) { setMsg('Title is required.'); return }
    setBusy(true); setMsg(null)
    const payload = {
      ...f,
      starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
      capacity: f.capacity === '' ? null : Number(f.capacity),
      forum_mode: f.forum_mode,
      forum_id: f.forum_mode === 'connect' ? (f.forum_id || null) : null,
      forum_name: f.forum_mode === 'create' ? (f.forum_name || null) : null,
      forum_cover: f.forum_mode === 'create' ? (f.forum_cover || null) : null,
    }
    if (f.forum_mode === 'connect' && !f.forum_id) { setBusy(false); setMsg('Choose a forum to connect, or pick another option.'); return }
    if (event?.id) payload.id = event.id
    const res = await fetch('/api/admin/events', { method: event?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) })
    setBusy(false)
    if (res.ok) { onSaved(); onClose() } else { const d = await res.json(); setMsg(d.error || 'Could not save.') }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 640, maxWidth: '96vw', padding: 26, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: ffH, fontSize: 22, fontWeight: 700 }}>{event?.id ? 'Edit event' : 'New event'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <div style={label}>Title</div><input value={f.title} onChange={e => set('title', e.target.value)} style={input} />
        <div style={label}>Teaser (card blurb)</div><input value={f.blurb} onChange={e => set('blurb', e.target.value)} style={input} />
        <div style={label}>Description</div><textarea value={f.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><div style={label}>Starts</div><input type="datetime-local" value={f.starts_at} onChange={e => set('starts_at', e.target.value)} style={input} /></div>
          <div><div style={label}>Ends</div><input type="datetime-local" value={f.ends_at} onChange={e => set('ends_at', e.target.value)} style={input} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 12 }}>
          <div><div style={label}>Type</div>
            <select value={f.location_type} onChange={e => set('location_type', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              <option value="virtual">Virtual</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div><div style={label}>Location</div><input value={f.location} onChange={e => set('location', e.target.value)} placeholder="Venue / Zoom" style={input} /></div>
          <div><div style={label}>Capacity</div><input type="number" value={f.capacity} onChange={e => set('capacity', e.target.value)} placeholder="∞" style={input} /></div>
        </div>
        <div style={label}>Join link (shown to attendees)</div><input value={f.join_url} onChange={e => set('join_url', e.target.value)} placeholder="https://…" style={input} />
        <div style={label}>Cover image URL</div><input value={f.cover_image_url} onChange={e => set('cover_image_url', e.target.value)} placeholder="https://…" style={input} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><div style={label}>Host name</div><input value={f.host_name} onChange={e => set('host_name', e.target.value)} style={input} /></div>
          <div><div style={label}>Status</div>
            <select value={f.status} onChange={e => set('status', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div style={label}>Attendee discussion forum</div>
        <ForumModeSelect value={f.forum_mode} onChange={v => set('forum_mode', v)} />
        {f.forum_mode === 'create' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={f.forum_name} onChange={e => set('forum_name', e.target.value)} placeholder={`Forum name — defaults to “${f.title || 'the event name'}”`} style={{ ...input }} />
              <button type="button" onClick={() => set('forum_name', f.title)} disabled={!f.title.trim()} style={{ whiteSpace: 'nowrap', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontFamily: ff, fontSize: 12.5, cursor: f.title.trim() ? 'pointer' : 'default', color: '#555' }}>Use event name</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ ...label, margin: '0 0 6px' }}>Forum thumbnail</div>
              <ForumImageField value={f.forum_cover} onChange={v => set('forum_cover', v)} supabase={supabase} />
            </div>
          </div>
        )}
        {f.forum_mode === 'connect' && (
          <select value={f.forum_id} onChange={e => set('forum_id', e.target.value)} style={{ ...input, cursor: 'pointer', marginTop: 8 }}>
            <option value="">Choose a forum…</option>
            {forums.map(fo => <option key={fo.id} value={fo.id}>{fo.name}{fo.tied_to_type === 'event' ? ' (event)' : ''}</option>)}
          </select>
        )}
        <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>Members are auto-added to this forum when they RSVP{hadForum && f.forum_mode !== 'connect' ? ' · this event already has a forum' : ''}.</p>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, fontSize: 13.5, color: '#333', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.featured_in_newsletter} onChange={e => set('featured_in_newsletter', e.target.checked)} />
          Feature in the newsletter banner
        </label>
        <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>Shows as the featured event at the top of the next newsletter (the soonest upcoming featured event is used).</p>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13.5, color: '#333', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.featured_home} onChange={e => set('featured_home', e.target.checked)} />
          Feature on the homepage
        </label>
        <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>Shows in the “Featured events” section on the public homepage (up to 3, soonest first).</p>
        {msg && <p style={{ color: DP, fontSize: 13, marginTop: 12 }}>{msg}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 18px', fontFamily: ff, fontSize: 13, cursor: 'pointer', color: '#555' }}>Cancel</button>
          <button onClick={save} disabled={busy || !f.title.trim()} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save event'}</button>
        </div>
      </div>
    </div>
  )
}

function AttendeesModal({ token, event, onClose }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true)
  useEffect(() => { (async () => { const r = await fetch(`/api/admin/events/${event.id}/rsvps`, { headers: { Authorization: `Bearer ${await token()}` } }); const d = await r.json(); setRows(d.attendees || []); setLoading(false) })() }, [])
  const emails = rows.filter(r => r.status === 'going' && r.email).map(r => r.email).join(', ')
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 560, maxWidth: '96vw', padding: 26, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: ffH, fontSize: 21, fontWeight: 700 }}>Attendees</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{event.title}</p>
        {emails && <button onClick={() => navigator.clipboard?.writeText(emails)} style={{ background: PINK, border: 'none', borderRadius: 7, padding: '7px 14px', fontFamily: ff, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>Copy going emails</button>}
        {loading ? <p style={{ color: '#aaa', fontSize: 13 }}>Loading…</p>
          : rows.length === 0 ? <p style={{ color: '#bbb', fontSize: 13, fontStyle: 'italic' }}>No RSVPs yet.</p>
          : rows.map((r, i) => (
            <div key={i} style={{ borderTop: `1px solid ${BORDER}`, padding: '9px 0', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span><strong style={{ color: '#0a0a0a' }}>{r.full_name}</strong> <span style={{ color: '#aaa' }}>{r.email}</span></span>
              <span style={{ color: r.status === 'going' ? '#2d8f5a' : '#b26a00', fontSize: 12 }}>{r.status}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function EventsSection({ supabase }) {
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
  const [events, setEvents] = useState([])
  const [forums, setForums] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(undefined)
  const [attending, setAttending] = useState(null)

  async function load() {
    setLoading(true)
    try { const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${await token()}` } }); const d = await res.json(); setEvents(d.events || []); setForums(d.forums || []) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function del(id) {
    if (!confirm('Delete this event? (RSVPs are removed; a tied forum is detached.)')) return
    await fetch('/api/admin/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id }) })
    setEvents(es => es.filter(e => e.id !== id))
  }

  const th = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', padding: '12px 16px', textAlign: 'left', fontWeight: 500 }
  const td = { padding: '13px 16px', fontFamily: ff, fontSize: 13.5, verticalAlign: 'middle' }

  return (
    <div style={{ fontFamily: ff }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: 30, fontWeight: 700, margin: 0 }}>Events</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>Salons and readings. RSVPs auto-join the event’s discussion forum and trigger the confirmation email.</p>
        </div>
        <button onClick={() => setEditing(null)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>+ New event</button>
      </div>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Loading…</div>
          : events.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No events yet. Create your first salon.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Event</th><th style={th}>When</th><th style={th}>Going</th><th style={th}>Discussion</th><th style={th}>Status</th><th style={th}></th></tr></thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={td}><strong style={{ color: '#0a0a0a' }}>{e.title}</strong>{e.host_name && <div style={{ color: '#aaa', fontSize: 12 }}>{e.host_name}</div>}</td>
                    <td style={{ ...td, color: '#666' }}>{e.starts_at ? new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td style={{ ...td }}><button onClick={() => setAttending(e)} style={{ background: 'none', border: 'none', color: DP, cursor: 'pointer', fontFamily: ff, fontSize: 13.5, textDecoration: 'underline' }}>{e.going_count || 0}</button></td>
                    <td style={{ ...td, color: e.forum_id ? '#2d8f5a' : '#bbb' }}>{e.forum_id ? 'On' : '—'}</td>
                    <td style={{ ...td, textTransform: 'capitalize', color: e.status === 'published' ? '#2d8f5a' : e.status === 'cancelled' ? '#c04040' : '#999' }}>{e.status}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setEditing(e)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: ff, marginRight: 6 }}>Edit</button>
                      <button onClick={() => del(e.id)} style={{ background: 'none', border: '1px solid rgba(224,112,112,0.25)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: ff, color: '#c04040' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {editing !== undefined && <EventModal token={token} event={editing} forums={forums} supabase={supabase} onClose={() => setEditing(undefined)} onSaved={load} />}
      {attending && <AttendeesModal token={token} event={attending} onClose={() => setAttending(null)} />}
    </div>
  )
}
