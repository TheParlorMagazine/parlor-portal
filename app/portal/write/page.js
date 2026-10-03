'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '../../../lib/supabase'
import { prepareImageUpload, isDuplicateUpload } from '../../../lib/uploadImage'
import PortalShell from '../_components/PortalShell'
import RichTextEditor from '../../admin/articles/_components/RichTextEditor'
import { VERTICALS, MEMBER_POST_CONSENT, HOW_MEMBER_POSTS_WORK_HREF, PITCH_HREF } from '../../../lib/memberPosts'
import { confirmDialog } from '../../../lib/confirmDialog'

const SERIF = "'thermal-variable', Georgia, serif"

const STATUS = {
  draft: { label: 'Draft', color: '#888', bg: '#f0f0f0' },
  submitted: { label: 'In review', color: '#8a5a00', bg: 'var(--goldlight)' },
  approved: { label: 'In editing', color: '#2d8f5a', bg: '#eaf6ef' },
  published: { label: 'Published', color: '#2d8f5a', bg: '#eaf6ef' },
  released: { label: 'In community space', color: '#4a6fd4', bg: '#eef1fb' },
  community_only: { label: 'In community space', color: '#4a6fd4', bg: '#eef1fb' },
  changes_requested: { label: 'Needs changes', color: '#c04040', bg: '#fbeaee' },
  rejected: { label: 'Needs changes', color: '#c04040', bg: '#fbeaee' },
  removed: { label: 'Removed', color: '#c04040', bg: '#fbeaee' },
}

// Human "where is it" line for the list.
function whereText(s) {
  if (s.status === 'published') return s.vertical ? `Published in ${s.vertical}` : 'Published'
  if (s.status === 'approved') return s.vertical ? `In editing for ${s.vertical}` : 'In editing'
  if (s.status === 'released' || s.status === 'community_only') return 'In the community space'
  if (s.status === 'submitted') return 'With the editors'
  return null
}

function Badge({ status }) {
  const s = STATUS[status] || STATUS.draft
  return <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color, background: s.bg, borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>{s.label}</span>
}

const input = { width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: SERIF, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fff' }
const label = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '16px 0 6px' }

function ConsentModal({ onCancel, onConfirm, busy }) {
  const [ok, setOk] = useState(false)
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,18,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 540, maxWidth: '96vw', padding: 26, fontFamily: SERIF }}>
        <div style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, marginBottom: 6 }}>Before you submit</div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>Please read and agree — this is required to submit your member post.</p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: 'var(--cream)' }}>
          <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} style={{ width: 17, height: 17, marginTop: 2, accentColor: '#0a0a0a', flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, color: '#333', lineHeight: 1.6 }}>{MEMBER_POST_CONSENT}</span>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
          <button onClick={onCancel} disabled={busy} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 18px', fontFamily: SERIF, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={!ok || busy} style={{ background: ok ? '#0a0a0a' : '#bbb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontFamily: SERIF, fontSize: 14, cursor: ok ? 'pointer' : 'default' }}>{busy ? 'Submitting…' : 'Agree & submit'}</button>
        </div>
      </div>
    </div>
  )
}

function Editor({ id, onClose, auth, supabase }) {
  const [f, setF] = useState({ title: '', subtitle: '', vertical: '', body: '', cover_image_url: '', byline: '', bio: '', sources: '' })
  const [status, setStatus] = useState('draft')
  const [editorNote, setEditorNote] = useState('')
  const [subId, setSubId] = useState(id || null)
  const [loading, setLoading] = useState(!!id)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [saveState, setSaveState] = useState('') // '', 'saving', 'saved'
  const [showConsent, setShowConsent] = useState(false)
  const [article, setArticle] = useState(null) // linked article {published, author_approved_at}
  const [approving, setApproving] = useState(false)
  const fileRef = useRef(null)
  const dedupeRef = useRef(null)
  const subIdRef = useRef(id || null)
  const dirtyRef = useRef(false)
  const timerRef = useRef(null)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); dirtyRef.current = true }

  useEffect(() => {
    if (!id) return
    (async () => {
      const res = await fetch(`/api/portal/submissions?id=${id}`, { headers: await auth() })
      if (res.ok) { const d = await res.json(); const s = d.submission; setF({ title: s.title || '', subtitle: s.subtitle || '', vertical: s.vertical || '', body: s.body || '', cover_image_url: s.cover_image_url || '', byline: s.byline || '', bio: s.bio || '', sources: s.sources || '' }); setStatus(s.status); setEditorNote(s.editor_note || ''); setArticle(d.article || null) }
      setLoading(false)
    })()
  }, [id, auth])

  const locked = status === 'submitted' || status === 'published' || status === 'approved'

  // Persist current form; returns the saved row (or null on error).
  const persist = useCallback(async (submit, consent) => {
    if (!f.title.trim()) { if (submit) setMsg('Give your piece a title first.'); return null }
    const curId = subIdRef.current
    let res
    if (curId) res = await fetch('/api/portal/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ id: curId, ...f, submit, consent }) })
    else res = await fetch('/api/portal/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify(f) })
    const d = await res.json()
    if (!res.ok) { setMsg(d.error || 'Could not save'); return null }
    if (d.submission?.id) { subIdRef.current = d.submission.id; setSubId(d.submission.id) }
    // If we just created and want to submit, do the submit PATCH now.
    if (submit && !curId && d.submission?.id) {
      const res2 = await fetch('/api/portal/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ id: d.submission.id, submit: true, consent }) })
      if (!res2.ok) { const e = await res2.json(); setMsg(e.error || 'Could not submit'); return null }
    }
    return d.submission
  }, [f, auth])

  // Debounced autosave while editable.
  useEffect(() => {
    if (locked || loading) return
    if (!dirtyRef.current) return
    if (!f.title.trim()) return
    clearTimeout(timerRef.current)
    setSaveState('saving')
    timerRef.current = setTimeout(async () => {
      dirtyRef.current = false
      const r = await persist(false)
      setSaveState(r ? 'saved' : '')
    }, 1200)
    return () => clearTimeout(timerRef.current)
  }, [f, locked, loading, persist])

  async function uploadCover(file) {
    if (!file || !file.type.startsWith('image/')) return
    if (isDuplicateUpload(dedupeRef, file)) return
    setUploading(true)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim: 1600 })
      const path = `submissions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path); set('cover_image_url', publicUrl) }
    } finally { setUploading(false) }
  }

  async function doSubmit() {
    setBusy(true); setMsg('')
    const r = await persist(true, true)
    setBusy(false)
    if (r) { setShowConsent(false); onClose(true) }
  }

  async function approveFinal() {
    setApproving(true)
    try {
      const res = await fetch('/api/portal/submissions/approve', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ id: subId }) })
      if (res.ok) { const d = await res.json(); setArticle(a => ({ ...(a || {}), author_approved_at: d.author_approved_at })) }
    } finally { setApproving(false) }
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>

  return (
    <div>
      <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 14, fontFamily: SERIF }}>← All posts</button>

      {(status === 'rejected' || status === 'changes_requested') && editorNote && (
        <div style={{ border: '1px solid #f0c4c4', background: '#fbeaee', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c04040', marginBottom: 5, fontWeight: 600 }}>Editor feedback</div>
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.55 }}>{editorNote}</div>
        </div>
      )}
      {locked && <div style={{ border: '1px solid var(--border)', background: 'var(--cream)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13.5, color: 'var(--muted)' }}>{status === 'published' ? 'This piece is published — it can’t be edited here.' : status === 'approved' ? 'An editor is preparing this for a vertical. You’ll be asked to approve the final version.' : 'This piece is with the editors. You’ll get a notification when it’s reviewed.'}</div>}

      {status === 'approved' && article && !article.published && (
        <div style={{ border: '1px solid #cfe8d8', background: '#eef8f1', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2d8f5a', marginBottom: 5, fontWeight: 600 }}>Final approval</div>
          {article.author_approved_at ? (
            <div style={{ fontSize: 13.5, color: '#2d7a4a' }}>✓ You approved the final version. It will publish once an editor releases it.</div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.55, marginBottom: 10 }}>Your editor has prepared the final, fact-checked version for its vertical. Approve it to allow publication.</div>
              <button onClick={approveFinal} disabled={approving} style={{ background: '#2d8f5a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: SERIF, fontSize: 13.5, cursor: 'pointer' }}>{approving ? 'Approving…' : 'Approve the final version'}</button>
            </>
          )}
        </div>
      )}

      <div className="prof-fld"><div style={label}>Cover image</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 120, height: 74, borderRadius: 8, background: '#f2ece4', overflow: 'hidden', flexShrink: 0 }}>{f.cover_image_url && <img src={f.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
          {!locked && <><button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontFamily: SERIF, fontSize: 13, cursor: 'pointer' }}>{uploading ? 'Uploading…' : (f.cover_image_url ? 'Change' : 'Upload')}</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const file = e.target.files?.[0]; if (file) uploadCover(file); e.target.value = '' }} /></>}
        </div>
      </div>

      <div style={label}>Title</div>
      <input value={f.title} onChange={e => set('title', e.target.value)} placeholder="Your headline" style={{ ...input, fontSize: 18, fontWeight: 600 }} disabled={locked} />
      <div style={label}>Subtitle <span style={{ textTransform: 'none', letterSpacing: 0 }}>· optional</span></div>
      <input value={f.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="A short deck" style={input} disabled={locked} />
      <div style={label}>Vertical</div>
      <select value={f.vertical} onChange={e => set('vertical', e.target.value)} style={{ ...input, cursor: locked ? 'default' : 'pointer' }} disabled={locked}>
        <option value="">Choose where it best fits…</option>
        {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <div style={label}>Byline <span style={{ textTransform: 'none', letterSpacing: 0 }}>· optional — how you want to be credited</span></div>
      <input value={f.byline} onChange={e => set('byline', e.target.value)} placeholder="Leave blank to use your name" style={input} disabled={locked} />

      <div style={label}>Body</div>
      {locked
        ? <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', background: '#fff', fontSize: 15.5, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: f.body || '<p style="color:#999">No content.</p>' }} />
        : <RichTextEditor slim content={f.body} onChange={html => set('body', html)} placeholder="Write your piece…" />}

      <div style={label}>Short bio <span style={{ textTransform: 'none', letterSpacing: 0 }}>· one line about you, shown with the piece</span></div>
      <input value={f.bio} onChange={e => set('bio', e.target.value)} placeholder="e.g. Maya is a writer and organizer based in Chicago." style={input} disabled={locked} />
      <div style={label}>Sources & links <span style={{ textTransform: 'none', letterSpacing: 0 }}>· optional — helps our editors fact-check</span></div>
      <textarea value={f.sources} onChange={e => set('sources', e.target.value)} rows={3} placeholder="Links, references, or notes to support fact-checking (not published)." style={{ ...input, resize: 'vertical', fontSize: 14 }} disabled={locked} />

      {!locked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
          <button onClick={() => { if (!f.title.trim()) { setMsg('Give your piece a title first.'); return } setShowConsent(true) }} disabled={busy} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontFamily: SERIF, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Submit for review</button>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved automatically' : 'Autosaves as you write'}</span>
          {msg && <span style={{ fontSize: 13, color: '#c04040' }}>{msg}</span>}
          {subId && <button onClick={async () => { if (!(await confirmDialog('Delete this draft?'))) return; await fetch('/api/portal/submissions', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ id: subId }) }); onClose(true) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c04040', fontSize: 13, cursor: 'pointer', fontFamily: SERIF }}>Delete draft</button>}
        </div>
      )}

      {showConsent && <ConsentModal busy={busy} onCancel={() => setShowConsent(false)} onConfirm={doSubmit} />}
    </div>
  )
}

function Write() {
  const supabase = useMemo(() => createClient(), [])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState({ mode: 'list', id: null })

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try { const res = await fetch('/api/portal/submissions', { headers: await auth() }); const d = await res.json(); setSubs(d.submissions || []) } catch {} finally { setLoading(false) }
  }, [auth])
  useEffect(() => { if (view.mode === 'list') load() }, [view.mode, load])

  return (
    <div style={{ maxWidth: 760 }}>
      <style>{`.prof-fld{margin-bottom:0}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8, gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, margin: '0 0 6px' }}>Member posts</h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0, lineHeight: 1.55, maxWidth: 560 }}>Share an essay, reflection or idea with the Parlor community. Member posts are unpaid and written by members. They appear in the member community space, and our editors may select some to edit, fact-check and publish in our verticals with a Member post label.</p>
        </div>
        {view.mode === 'list' && <button onClick={() => setView({ mode: 'edit', id: null })} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: SERIF, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ New draft</button>}
      </div>

      {view.mode === 'list' && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--cream)', borderRadius: 10, padding: '11px 15px', margin: '14px 0 22px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
          This isn’t a pitch. To be commissioned for paid work in the magazine, <a href={PITCH_HREF} style={{ color: '#0a0a0a', textDecoration: 'underline' }}>pitch us here</a>. <a href={HOW_MEMBER_POSTS_WORK_HREF} style={{ color: '#0a0a0a', textDecoration: 'underline' }}>How member posts work →</a>
        </div>
      )}

      {view.mode === 'edit' ? (
        <Editor id={view.id} auth={auth} supabase={supabase} onClose={() => setView({ mode: 'list', id: null })} />
      ) : loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : subs.length === 0 ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--cream)', padding: '34px 30px', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          <div style={{ fontFamily: SERIF, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>Nothing here yet</div>
          Start a draft and submit it. Your post will appear in the member community space, and an editor may select it to edit and publish in our verticals.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subs.map(s => {
            const where = whereText(s)
            return (
              <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>{s.title || 'Untitled'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    {[s.vertical, where].filter(Boolean).join(' · ')}{(s.vertical || where) ? ' · ' : ''}Updated {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <Badge status={s.status} />
                  <button onClick={() => setView({ mode: 'edit', id: s.id })} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 14px', fontFamily: SERIF, fontSize: 13, cursor: 'pointer' }}>{['draft', 'rejected', 'changes_requested'].includes(s.status) ? 'Edit' : 'View'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function WritePage() {
  return <PortalShell active=""><Write /></PortalShell>
}
