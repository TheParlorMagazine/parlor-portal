'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { prepareImageUpload, isDuplicateUpload } from '../../../../lib/uploadImage'
import PortalShell from '../../_components/PortalShell'
import { THREAD_GUIDELINES } from '../../_components/PostGuidelines'
import PostsWall from '../../_components/PostsWall'
import { forumCss } from '../forumCss'
import { confirmDialog, alertDialog } from '../../../../lib/confirmDialog'

function Av({ name, src }) {
  return <div className="fr-av">{src ? <img src={src} alt="" /> : (name || 'M')[0].toUpperCase()}</div>
}

// Sidebar list of attached events (upcoming / past).
function EventGroup({ label, events, top }) {
  if (!events.length) return null
  const fmt = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  return (
    <div style={{ marginTop: top ? 16 : 0, paddingTop: top ? 14 : 0, borderTop: top ? '1px solid var(--border)' : 'none' }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 10 }}>{label} · {events.length}</div>
      {events.map(e => (
        <a key={e.id} href={`/portal/events/${e.id}`} style={{ display: 'block', marginBottom: 12, textDecoration: 'none', color: 'var(--ink)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{e.title}</div>
          {e.starts_at && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{fmt(e.starts_at)}</div>}
        </a>
      ))}
    </div>
  )
}

// Sidebar list of people (moderators / members).
function PeopleGroup({ label, people, empty, top }) {
  return (
    <div style={{ marginTop: top ? 16 : 0, paddingTop: top ? 14 : 0, borderTop: top ? '1px solid var(--border)' : 'none' }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 10 }}>{label}{people.length ? ` · ${people.length}` : ''}</div>
      {people.length === 0
        ? <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{empty}</div>
        : people.map(p => (
            <a key={p.id} href={`/portal/members/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, textDecoration: 'none', color: 'var(--ink)' }}>
              <Av name={p.name} src={p.avatar} />
              <span style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            </a>
          ))}
    </div>
  )
}

const miniBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 9px', fontSize: 11.5, cursor: 'pointer', fontFamily: "'thermal-variable', Georgia, serif", color: '#555' }

function ModPanel({ id, auth, supabase, onChanged }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ requests: [], members: [], policy: 'request' })
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteLinks, setInviteLinks] = useState([])
  const [inviting, setInviting] = useState(false)
  // Edit forum (name + description + banner + square profile image)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState('')
  const [avatar, setAvatar] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMsg, setEditMsg] = useState('')
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarDrag, setAvatarDrag] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const dedupeRef = useMemo(() => ({ current: null }), [])
  const avatarDedupeRef = useMemo(() => ({ current: null }), [])

  async function uploadImage(file, { maxDim, folder, setBusy, setUrl, ref }) {
    if (!file || !file.type.startsWith('image/')) return
    if (isDuplicateUpload(ref, file)) return
    setBusy(true)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim })
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path); setUrl(publicUrl) }
    } finally { setBusy(false) }
  }
  const uploadCover = f => uploadImage(f, { maxDim: 1600, folder: 'forums', setBusy: setUploading, setUrl: setCover, ref: dedupeRef })
  const uploadAvatar = f => uploadImage(f, { maxDim: 600, folder: 'forum-avatars', setBusy: setAvatarUploading, setUrl: setAvatar, ref: avatarDedupeRef })

  async function saveEdit() {
    if (!name.trim()) { setEditMsg('Name required'); return }
    setSavingEdit(true); setEditMsg('')
    const res = await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ name, description, cover_image_url: cover, avatar_url: avatar }) })
    setSavingEdit(false)
    if (res.ok) { setEditMsg('Saved ✓'); setTimeout(() => window.location.reload(), 500) } else setEditMsg('Could not save')
  }

  async function sendInvites() {
    const emails = inviteEmails.split(/[\s,;]+/).filter(Boolean)
    if (emails.length === 0) return
    setInviting(true); setInviteMsg(''); setInviteLinks([])
    try {
      const res = await fetch(`/api/portal/groups/${id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ emails }) })
      const d = await res.json()
      if (res.ok) {
        setInviteEmails('')
        const parts = []
        if (d.added) parts.push(`${d.added} added`)
        if (d.invited) parts.push(`${d.invited} invited${d.emailed < d.invited ? ` (${d.emailed} emailed)` : ''}`)
        setInviteMsg(parts.length ? parts.join(' · ') : 'No new people to invite')
        setInviteLinks(d.links || [])
      } else setInviteMsg(d.error || 'Could not send')
    } finally { setInviting(false) }
  }
  const load = useCallback(async () => {
    const res = await fetch(`/api/portal/groups/${id}`, { headers: await auth() })
    if (res.ok) { const d = await res.json(); setData({ requests: d.requests || [], members: d.members || [], policy: d.group?.join_policy || 'request' }); setName(d.group?.name || ''); setDescription(d.group?.description || ''); setCover(d.group?.cover_image_url || ''); setAvatar(d.group?.avatar_url || '') }
  }, [id, auth])
  useEffect(() => { if (open) load() }, [open, load])

  async function setPolicy(p) { setData(s => ({ ...s, policy: p })); await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ join_policy: p }) }) }
  async function respond(mid, action) {
    await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ request_member_id: mid, action }) })
    setData(s => ({ ...s, requests: s.requests.filter(r => r.member_id !== mid) }))
    onChanged?.()
  }
  async function setRole(mid, role) {
    const res = await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ set_role_member_id: mid, role }) })
    if (res.ok) { load(); onChanged?.() } else { const d = await res.json().catch(() => ({})); alertDialog(d.error || 'Could not update') }
  }
  async function removeMember(mid, name) {
    if (!(await confirmDialog(`Remove ${name} from this forum?`))) return
    const res = await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ remove_member_id: mid }) })
    if (res.ok) { load(); onChanged?.() } else { const d = await res.json().catch(() => ({})); alertDialog(d.error || 'Could not remove') }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20, background: '#fff' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '13px 16px', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>⚙ Manage forum{data.requests.length > 0 ? <span style={{ color: '#c4364a' }}> · {data.requests.length} request{data.requests.length === 1 ? '' : 's'}</span> : ''}</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{open ? 'Hide' : 'Open'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Edit forum name + banner */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '6px 0 10px' }}>Forum details</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px' }}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Forum name" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'thermal-variable', Georgia, serif", fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '12px 0 6px' }}>Description <span style={{ opacity: 0.7 }}>— a short line shown under the forum name</span></div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this forum is about…" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13.5, outline: 'none', boxSizing: 'border-box', marginBottom: 8, resize: 'vertical' }} />
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '12px 0 6px' }}>Banner image <span style={{ opacity: 0.7 }}>— wide image across the top of the forum</span></div>
          <label
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const fl = e.dataTransfer.files?.[0]; if (fl) uploadCover(fl) }}
            style={{ display: 'block', position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `1.5px dashed ${drag ? '#7a2531' : cover ? 'transparent' : 'var(--border)'}`, background: drag ? '#faf3f5' : cover ? 'transparent' : 'var(--cream)', minHeight: cover ? 0 : 60 }}>
            <input type="file" accept="image/*" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) uploadCover(fl); e.target.value = '' }} />
            {cover ? (
              <>
                <img src={cover} alt="" style={{ display: 'block', width: '100%', height: 90, objectFit: 'cover', background: '#eee' }} />
                <div style={{ position: 'absolute', inset: 0, background: drag ? 'rgba(122,37,49,0.18)' : 'transparent', transition: 'background 0.15s' }} />
                <div style={{ position: 'absolute', top: 7, right: 7, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                {uploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--muted)', fontFamily: "'thermal-variable', Georgia, serif" }}>Uploading…</div>}
              </>
            ) : (
              <div style={{ padding: 16, fontSize: 12.5, color: 'var(--muted)' }}>
                {uploading ? 'Uploading…' : <><strong style={{ color: '#555' }}>Drag &amp; drop</strong> a banner image, or <span style={{ color: '#7a2531' }}>click to upload</span></>}
              </div>
            )}
          </label>
          {cover && <button onClick={() => setCover('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: "'thermal-variable', Georgia, serif", padding: '4px 0', marginTop: 4 }}>Remove banner</button>}

          {/* Square profile image — used as the thumbnail on the forums list */}
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '12px 0 6px' }}>Profile image <span style={{ opacity: 0.7 }}>— square thumbnail shown on the forums list</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label
              onDragOver={e => { e.preventDefault(); setAvatarDrag(true) }}
              onDragLeave={() => setAvatarDrag(false)}
              onDrop={e => { e.preventDefault(); setAvatarDrag(false); const fl = e.dataTransfer.files?.[0]; if (fl) uploadAvatar(fl) }}
              style={{ position: 'relative', display: 'block', width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: `1.5px dashed ${avatarDrag ? '#7a2531' : avatar ? 'transparent' : 'var(--border)'}`, background: avatarDrag ? '#faf3f5' : avatar ? 'transparent' : 'var(--cream)', flexShrink: 0 }}>
              <input type="file" accept="image/*" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) uploadAvatar(fl); e.target.value = '' }} />
              {avatar ? (
                <>
                  <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </div>
                  </div>
                  {avatarUploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)' }}>…</div>}
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarUploading ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>…</span> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                </div>
              )}
            </label>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              {avatar
                ? <><strong style={{ color: '#555', display: 'block', marginBottom: 2 }}>Profile image set</strong>Click or drag onto the circle to replace{avatarUploading ? ' — uploading…' : ''}<br /><button onClick={() => setAvatar('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: "'thermal-variable', Georgia, serif", marginTop: 4 }}>Remove</button></>
                : <><strong style={{ color: '#555' }}>Drag &amp; drop</strong> or click the circle to upload</>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <button onClick={saveEdit} disabled={savingEdit} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{savingEdit ? 'Saving…' : 'Save details'}</button>
            {editMsg && <span style={{ fontSize: 12.5, color: editMsg.includes('✓') ? '#2d8f5a' : '#c04040' }}>{editMsg}</span>}
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '6px 0 8px' }}>Who can join</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            {[['open', 'Public'], ['request', 'Private']].map(([v, l]) => (
              <button key={v} onClick={() => setPolicy(v)} style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${data.policy === v ? '#0a0a0a' : 'var(--border)'}`, background: data.policy === v ? '#0a0a0a' : '#fff', color: data.policy === v ? '#fff' : 'var(--ink)', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 12.5, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>{data.policy === 'open' ? 'Public — anyone can join instantly.' : data.policy === 'paid' ? 'Paid — only paid members can join.' : 'Private — the forum is visible to all, but members request to join and you approve.'}</div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '6px 0 8px' }}>Invite people</div>
          <textarea value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} rows={2} placeholder="Emails, comma or space separated…" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button onClick={sendInvites} disabled={inviting || !inviteEmails.trim()} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13, fontWeight: 500, cursor: inviteEmails.trim() ? 'pointer' : 'default' }}>{inviting ? 'Sending…' : 'Send invites'}</button>
            {inviteMsg && <span style={{ fontSize: 12.5, color: '#2d8f5a' }}>{inviteMsg}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Members are added instantly; others get an emailed link — or copy their link below to share directly.</div>
          {inviteLinks.length > 0 && (
            <div style={{ marginTop: 10, marginBottom: 16 }}>
              {inviteLinks.map(l => (
                <div key={l.email} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink)', flexShrink: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.email}</span>
                  <input readOnly value={l.url} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontFamily: 'monospace', background: 'var(--cream)' }} />
                  <button onClick={() => navigator.clipboard?.writeText(l.url)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: "'thermal-variable', Georgia, serif", flexShrink: 0 }}>Copy</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: 16 }} />
          {data.requests.length > 0 && (
            <>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '6px 0 8px' }}>Join requests</div>
              {data.requests.map(r => (
                <div key={r.member_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14 }}>{r.name}</span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => respond(r.member_id, 'decline')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12.5, cursor: 'pointer', fontFamily: "'thermal-variable', Georgia, serif" }}>Decline</button>
                    <button onClick={() => respond(r.member_id, 'approve')} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'thermal-variable', Georgia, serif" }}>Approve</button>
                  </span>
                </div>
              ))}
            </>
          )}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '14px 0 8px', paddingTop: 12, borderTop: '1px solid var(--border)' }}>Members &amp; moderators · {data.members.length}</div>
          {data.members.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>No members yet.</div>}
          {data.members.map(m => (
            <div key={m.member_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', gap: 8 }}>
              <span style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                {m.role === 'host' && <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7a2531', background: '#faf3f5', borderRadius: 20, padding: '2px 7px', flexShrink: 0 }}>Mod</span>}
              </span>
              <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {m.role === 'host'
                  ? <button onClick={() => setRole(m.member_id, 'member')} style={miniBtn}>Remove mod</button>
                  : <button onClick={() => setRole(m.member_id, 'host')} style={miniBtn}>Make mod</button>}
                <button onClick={() => removeMember(m.member_id, m.name)} style={{ ...miniBtn, color: '#c04040', borderColor: '#e2b4b4' }}>Remove</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState({ loading: true, forum: null, members: [], events: { upcoming: [], past: [] } })
  const [uid, setUid] = useState(null)
  const [showRules, setShowRules] = useState(false)

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/forums/${id}`, { headers: await auth() })
      if (!res.ok) { setData({ loading: false, forum: null, members: [], events: { upcoming: [], past: [] } }); return }
      const d = await res.json()
      setData({ loading: false, forum: d.forum, members: d.members || [], events: d.events || { upcoming: [], past: [] } })
    } catch { setData({ loading: false, forum: null, members: [], events: { upcoming: [], past: [] } }) }
  }, [id, auth])

  useEffect(() => { load() }, [load])
  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); setUid(user?.id || null) })() }, [supabase])

  if (data.loading) return <div className="fr-wrap"><style>{forumCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!data.forum) return (
    <div className="fr-wrap"><style>{forumCss}</style>
      <a className="fr-back" href="/portal/forums">← Forums</a>
      <div className="fr-empty">This forum isn’t available, or you’re not a member.</div>
    </div>
  )

  const f = data.forum
  return (
    <div className="fr-wrap" style={{ maxWidth: 'none' }}>
      <style>{forumCss}</style>
      <a className="fr-back" href="/portal/forums">← Forums</a>
      {f.cover_image_url && (
        <img src={f.cover_image_url} alt="" style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block', margin: '10px 0 20px', background: '#f2ece4' }} />
      )}
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 460px', minWidth: 0 }}>
      <div className="fr-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {(f.avatar_url || f.cover_image_url)
            ? <img src={f.avatar_url || f.cover_image_url} alt="" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#f2ece4', boxShadow: '0 0 0 3px #fff, 0 1px 4px rgba(0,0,0,0.12)' }} />
            : <div style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, background: '#e9e2d8', color: '#7a2531', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, fontFamily: "'thermal-variable', Georgia, serif" }}>{(f.name || 'F')[0].toUpperCase()}</div>}
          <div style={{ minWidth: 0 }}>
            <h1 className="fr-h1">{f.name}</h1>
            {f.description && <p className="fr-sub" style={{ margin: 0 }}>{f.description}</p>}
          </div>
        </div>
      </div>

      {f.my_role === 'host' && <ModPanel id={id} auth={auth} supabase={supabase} onChanged={load} />}

      {f.guidelines && (
        <div className="fr-guide">
          <div className="fr-guide-title">Room guidelines</div>
          <div className="fr-guide-body">{f.guidelines}</div>
        </div>
      )}

      {/* Pinned rules of engagement — opens the full rules in a modal. */}
      <button
        onClick={() => setShowRules(true)}
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11, background: 'linear-gradient(135deg,#fbeff2,#fdf5f6)', border: '1px solid #ecd7dc', borderLeft: '3px solid #7a2531', borderRadius: 10, padding: '11px 15px', marginBottom: 14, cursor: 'pointer', fontFamily: "'thermal-variable', Georgia, serif" }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>📌</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a2531', display: 'block' }}>Pinned · Rules of engagement</span>
          <span style={{ fontSize: 13, color: '#6a5a5d', display: 'block', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Be thoughtful, engage ideas not people, and keep it in good faith.</span>
        </span>
        <span style={{ fontSize: 12.5, color: '#7a2531', fontWeight: 500, flexShrink: 0 }}>Read the rules →</span>
      </button>

      {/* Rich post feed — profile-style composer, media cards, and comments,
          scoped to this forum. */}
      <PostsWall forumId={id} currentUserId={uid} />
        </div>

        {/* Right sidebar — moderators + members */}
        <aside style={{ flex: '0 0 220px', width: 220 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: '16px 16px 8px' }}>
            <PeopleGroup label="Moderators" people={(data.members || []).filter(m => m.role === 'host')} empty="No moderators" />
            <PeopleGroup label="Members" people={(data.members || []).filter(m => m.role !== 'host')} empty="No members yet" top />
          </div>
          {((data.events?.upcoming?.length || 0) + (data.events?.past?.length || 0)) > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: '16px 16px 8px', marginTop: 16 }}>
              <EventGroup label="Upcoming events" events={data.events?.upcoming || []} />
              <EventGroup label="Past events" events={data.events?.past || []} top />
            </div>
          )}
        </aside>
      </div>

      {showRules && (
        <div className="fr-modal-bg" onClick={() => setShowRules(false)}>
          <div className="fr-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>📌</span>
              <div className="fr-modal-title" style={{ margin: 0 }}>Rules of engagement</div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
              The Parlor is a room for thoughtful conversation. By posting here, you agree to keep it that way.
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {THREAD_GUIDELINES.map((it, i) => (
                <li key={i} style={{ fontSize: 14.5, color: '#333', lineHeight: 1.85 }}>{it}</li>
              ))}
            </ul>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '14px 0 4px', lineHeight: 1.6 }}>
              If you wouldn’t say it in a room full of thoughtful people, don’t post it here. Moderators may remove posts that break these rules.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="fr-postbtn" onClick={() => setShowRules(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ForumDetailPage() {
  return <PortalShell active="groups"><Detail /></PortalShell>
}
