'use client'

import { useEffect, useState, useRef } from 'react'
import { prepareImageUpload, isDuplicateUpload } from '../../../lib/uploadImage'
import { confirmDialog } from '../../../lib/confirmDialog'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const BORDER = '#e5e0e2'
const DP = '#c4364a'

const input = { width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '14px 0 6px' }

function toLocalInput(iso) { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

// ── Book form modal (create / edit) ──
function BookModal({ token, book, supabase, onClose, onSaved }) {
  const [f, setF] = useState({
    title: book?.title || '', author: book?.author || '', cover_image_url: book?.cover_image_url || '',
    book_url: book?.book_url || '', blurb: book?.blurb || '', status: book?.status || 'upcoming',
    meeting_at: toLocalInput(book?.meeting_at), sort: book?.sort ?? 0,
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dedupeRef = useRef(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  async function uploadCover(file) {
    if (!file || !file.type.startsWith('image/')) return
    if (!supabase) { setMsg('Upload unavailable — paste a URL instead.'); return }
    if (isDuplicateUpload(dedupeRef, file)) return
    setUploading(true); setMsg(null)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim: 1200 })
      const path = `book-club/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (error) { setMsg('Upload failed — paste a URL instead.'); return }
      const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path)
      set('cover_image_url', publicUrl)
    } finally { setUploading(false) }
  }

  async function save() {
    if (!f.title.trim()) { setMsg('Title is required.'); return }
    setBusy(true); setMsg(null)
    const payload = { ...f, meeting_at: f.meeting_at ? new Date(f.meeting_at).toISOString() : null, sort: Number(f.sort) || 0 }
    if (book?.id) payload.id = book.id
    const res = await fetch('/api/admin/book-club', { method: book?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) })
    setBusy(false)
    if (res.ok) { onSaved(); onClose() } else { const d = await res.json(); setMsg(d.error || 'Could not save.') }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 620, maxWidth: '96vw', padding: 26, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: ffH, fontSize: 22, fontWeight: 700 }}>{book?.id ? 'Edit book' : 'Add book'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><div style={label}>Title</div><input value={f.title} onChange={e => set('title', e.target.value)} style={input} /></div>
          <div><div style={label}>Author</div><input value={f.author} onChange={e => set('author', e.target.value)} style={input} /></div>
        </div>
        <div style={label}>Cover image</div>
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const fl = e.dataTransfer.files?.[0]; if (fl) uploadCover(fl) }}
          style={{ border: `1.5px dashed ${drag ? DP : BORDER}`, borderRadius: 8, background: drag ? '#fdf1f3' : '#faf8f6', padding: f.cover_image_url ? 8 : 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          {f.cover_image_url
            ? <><img src={f.cover_image_url} alt="" style={{ width: 40, height: 58, borderRadius: 5, objectFit: 'cover', flexShrink: 0, background: '#eee' }} /><div style={{ fontSize: 12, color: '#888', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.cover_image_url}</div><button onClick={() => set('cover_image_url', '')} style={{ background: 'none', border: 'none', color: DP, fontSize: 12.5, cursor: 'pointer', fontFamily: ff }}>Remove</button></>
            : <div style={{ fontSize: 12.5, color: '#888' }}>{uploading ? 'Uploading…' : <><strong style={{ color: '#555' }}>Drag &amp; drop</strong> a cover, or <label style={{ color: DP, cursor: 'pointer' }}>upload<input type="file" accept="image/*" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) uploadCover(fl); e.target.value = '' }} /></label></>}</div>}
        </div>
        <input value={f.cover_image_url} onChange={e => set('cover_image_url', e.target.value)} placeholder="…or paste a cover image URL" style={{ ...input, marginTop: 8, fontSize: 13 }} />
        <div style={label}>Book link (buy / read)</div><input value={f.book_url} onChange={e => set('book_url', e.target.value)} placeholder="https://…" style={input} />
        <div style={label}>Blurb / why we chose it</div><textarea value={f.blurb} onChange={e => set('blurb', e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 12 }}>
          <div><div style={label}>Status</div>
            <select value={f.status} onChange={e => set('status', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              <option value="current">Current</option><option value="upcoming">Upcoming</option><option value="past">Past</option>
            </select>
          </div>
          <div><div style={label}>Discussion date</div><input type="datetime-local" value={f.meeting_at} onChange={e => set('meeting_at', e.target.value)} style={input} /></div>
          <div><div style={label}>Sort</div><input type="number" value={f.sort} onChange={e => set('sort', e.target.value)} style={input} /></div>
        </div>
        {msg && <p style={{ color: DP, fontSize: 13, marginTop: 12 }}>{msg}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 18px', fontFamily: ff, fontSize: 13, cursor: 'pointer', color: '#555' }}>Cancel</button>
          <button onClick={save} disabled={busy || !f.title.trim()} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save book'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Prompts manager modal ──
function PromptsModal({ token, book, onClose, onChanged }) {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch(`/api/admin/book-club/${book.id}/prompts`, { headers: { Authorization: `Bearer ${await token()}` } })
    const d = await res.json(); setPrompts(d.prompts || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!title.trim() || busy) return
    setBusy(true)
    const res = await fetch(`/api/admin/book-club/${book.id}/prompts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ title: title.trim(), body: body.trim(), pinned }) })
    setBusy(false)
    if (res.ok) { setTitle(''); setBody(''); setPinned(false); await load(); onChanged?.() }
  }
  async function del(id) {
    if (!(await confirmDialog('Remove this prompt?'))) return
    await fetch(`/api/admin/book-club/${book.id}/prompts`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ prompt_id: id }) })
    setPrompts(ps => ps.filter(p => p.id !== id)); onChanged?.()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 620, maxWidth: '96vw', padding: 26, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <div style={{ fontFamily: ffH, fontSize: 21, fontWeight: 700 }}>Discussion prompts</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>{book.title} — prompts you post here open for paid members to respond.</p>

        <div style={{ background: '#fafafa', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ ...label, marginTop: 0 }}>New prompt</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Prompt question…" style={input} />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="Extra context (optional)" style={{ ...input, resize: 'vertical', marginTop: 8 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} /> Pin to top</label>
            <button onClick={add} disabled={busy || !title.trim()} style={{ background: PINK, border: 'none', borderRadius: 7, padding: '8px 18px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{busy ? 'Posting…' : 'Post prompt'}</button>
          </div>
        </div>

        {loading ? <p style={{ color: '#aaa', fontSize: 13 }}>Loading…</p>
          : prompts.length === 0 ? <p style={{ color: '#bbb', fontSize: 13, fontStyle: 'italic' }}>No prompts yet.</p>
          : prompts.map(p => (
            <div key={p.id} style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div><strong style={{ color: '#0a0a0a', fontSize: 14 }}>{p.pinned ? '📌 ' : ''}{p.title}</strong><div style={{ fontSize: 12, color: '#aaa' }}>{p.reply_count} repl{p.reply_count === 1 ? 'y' : 'ies'} · {p.upvote_count} upvotes</div></div>
              <button onClick={() => del(p.id)} style={{ background: 'none', border: 'none', color: '#c04040', fontSize: 12, cursor: 'pointer', fontFamily: ff }}>Remove</button>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function ReadingRoomSection({ supabase }) {
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(undefined) // undefined=closed, null=new, obj=edit
  const [prompting, setPrompting] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/admin/book-club', { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json(); setBooks(d.books || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function del(id) {
    if (!(await confirmDialog('Delete this book and its discussions?'))) return
    await fetch('/api/admin/book-club', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id }) })
    setBooks(bs => bs.filter(b => b.id !== id))
  }

  const th = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', padding: '12px 16px', textAlign: 'left', fontWeight: 500 }
  const td = { padding: '13px 16px', fontFamily: ff, fontSize: 13.5, verticalAlign: 'middle' }

  return (
    <div style={{ fontFamily: ff }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: 30, fontWeight: 700, margin: 0 }}>Reading Room</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>The book club — selections and editor discussion prompts. Discussions are for paid members.</p>
        </div>
        <button onClick={() => setEditing(null)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>+ Add book</button>
      </div>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Loading…</div>
          : books.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No books yet. Add your first selection.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Book</th><th style={th}>Status</th><th style={th}>Discussion date</th><th style={th}></th></tr></thead>
              <tbody>
                {books.map(b => (
                  <tr key={b.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {b.cover_image_url && <img src={b.cover_image_url} alt="" style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 4 }} />}
                        <div><strong style={{ color: '#0a0a0a' }}>{b.title}</strong>{b.author && <div style={{ color: '#aaa', fontSize: 12 }}>{b.author}</div>}</div>
                      </div>
                    </td>
                    <td style={{ ...td, textTransform: 'capitalize', color: b.status === 'current' ? DP : '#666' }}>{b.status}</td>
                    <td style={{ ...td, color: '#666' }}>{b.meeting_at ? new Date(b.meeting_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setPrompting(b)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: ff, marginRight: 6 }}>Prompts</button>
                      <button onClick={() => setEditing(b)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: ff, marginRight: 6 }}>Edit</button>
                      <button onClick={() => del(b.id)} style={{ background: 'none', border: '1px solid rgba(224,112,112,0.25)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: ff, color: '#c04040' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {editing !== undefined && <BookModal token={token} book={editing} supabase={supabase} onClose={() => setEditing(undefined)} onSaved={load} />}
      {prompting && <PromptsModal token={token} book={prompting} onClose={() => setPrompting(null)} onChanged={load} />}
    </div>
  )
}
