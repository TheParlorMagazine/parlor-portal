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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMsg, setEditMsg] = useState('')

  async function saveEdit() {
    if (!name.trim()) { setEditMsg('Name required'); return }
    setSavingEdit(true); setEditMsg('')
    const res = await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ name, description }) })
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
    if (res.ok) { const d = await res.json(); setData({ requests: d.requests || [], members: d.members || [], policy: d.group?.join_policy || 'request' }); setName(d.group?.name || ''); setDescription(d.group?.description || '') }
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
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const bannerDedupeRef = useMemo(() => ({ current: null }), [])
  const avatarDedupeRef2 = useMemo(() => ({ current: null }), [])
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [eventForm, setEventForm] = useState({ title: '', blurb: '', starts_at: '', ends_at: '', location_type: 'virtual', location: '', join_url: '', capacity: '' })
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventErr, setEventErr] = useState('')

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

  async function uploadForumImage(file, { maxDim, folder, setBusy, field, ref }) {
    if (!file || !file.type.startsWith('image/')) return
    if (isDuplicateUpload(ref, file)) return
    setBusy(true)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim })
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path)
        const { data: { session } } = await supabase.auth.getSession()
        const headers = session ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
        await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ [field]: publicUrl }) })
        await load()
      }
    } finally { setBusy(false) }
  }

  async function createEvent() {
    if (!eventForm.title.trim()) { setEventErr('Title is required'); return }
    setCreatingEvent(true); setEventErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }
      const res = await fetch('/api/portal/events', { method: 'POST', headers, body: JSON.stringify({ ...eventForm, forum_id: id, capacity: eventForm.capacity ? Number(eventForm.capacity) : null }) })
      if (res.ok) {
        const d = await res.json()
        setShowCreateEvent(false)
        setEventForm({ title: '', blurb: '', starts_at: '', ends_at: '', location_type: 'virtual', location: '', join_url: '', capacity: '' })
        await load()
        window.location.href = `/portal/events/${d.id}`
      } else {
        const d = await res.json()
        setEventErr(d.error || 'Could not create event')
      }
    } finally { setCreatingEvent(false) }
  }

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
      {(f.cover_image_url || f.my_role === 'host') && (
        <div style={{ position: 'relative', margin: '10px 0 20px' }}>
          {f.cover_image_url
            ? <img src={f.cover_image_url} alt="" style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block', background: '#f2ece4' }} />
            : f.my_role === 'host' && <div style={{ width: '100%', height: 120, borderRadius: 12, background: '#f2ece4', border: '1.5px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>No banner yet — click pencil to add</div>}
          {f.my_role === 'host' && (
            <label style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }} title="Change banner image">
              <input type="file" accept="image/*" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) uploadForumImage(fl, { maxDim: 1600, folder: 'forums', setBusy: setUploadingBanner, field: 'cover_image_url', ref: bannerDedupeRef }); e.target.value = '' }} />
              {uploadingBanner
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="9" strokeDasharray="28 56" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            </label>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 460px', minWidth: 0 }}>
      <div className="fr-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {(f.avatar_url || f.cover_image_url || f.my_role === 'host')
            ? <div style={{ position: 'relative', flexShrink: 0 }}>
                {(f.avatar_url || f.cover_image_url)
                  ? <img src={f.avatar_url || f.cover_image_url} alt="" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', background: '#f2ece4', boxShadow: '0 0 0 3px #fff, 0 1px 4px rgba(0,0,0,0.12)', display: 'block' }} />
                  : <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#e9e2d8', color: '#7a2531', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, fontFamily: "'thermal-variable', Georgia, serif" }}>{(f.name || 'F')[0].toUpperCase()}</div>}
                {f.my_role === 'host' && (
                  <label style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }} title="Change profile image">
                    <input type="file" accept="image/*" hidden onChange={e => { const fl = e.target.files?.[0]; if (fl) uploadForumImage(fl, { maxDim: 600, folder: 'forum-avatars', setBusy: setUploadingAvatar, field: 'avatar_url', ref: avatarDedupeRef2 }); e.target.value = '' }} />
                    {uploadingAvatar
                      ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="9" strokeDasharray="28 56" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
                      : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                  </label>
                )}
              </div>
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
          {(((data.events?.upcoming?.length || 0) + (data.events?.past?.length || 0)) > 0 || f.my_role === 'host') && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: '16px 16px 8px', marginTop: 16 }}>
              <EventGroup label="Upcoming events" events={data.events?.upcoming || []} />
              <EventGroup label="Past events" events={data.events?.past || []} top={!!(data.events?.upcoming?.length)} />
              {f.my_role === 'host' && (
                <button onClick={() => setShowCreateEvent(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 12px', width: '100%', cursor: 'pointer', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 12.5, color: 'var(--muted)', marginTop: 10, marginBottom: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create event
                </button>
              )}
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

      {showCreateEvent && (
        <div className="fr-modal-bg" onClick={() => setShowCreateEvent(false)}>
          <div className="fr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="fr-modal-title" style={{ margin: 0 }}>Create event</div>
              <button onClick={() => setShowCreateEvent(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>✕</button>
            </div>
            {[
              ['Title', 'title', 'text', 'e.g. Democracy Salons – October', true],
              ['Short blurb', 'blurb', 'text', 'One-line teaser for the event card', false],
            ].map(([label, key, type, placeholder, required]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{label}{required && <span style={{ color: '#c04040' }}> *</span>}</div>
                <input value={eventForm[key]} onChange={e => setEventForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[['Start date & time', 'starts_at'], ['End date & time', 'ends_at']].map(([label, key]) => (
                <div key={key}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                  <input type="datetime-local" value={eventForm[key]} onChange={e => setEventForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Location type</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['virtual', 'Virtual'], ['in_person', 'In person'], ['hybrid', 'Hybrid']].map(([v, l]) => (
                  <button key={v} onClick={() => setEventForm(f => ({ ...f, location_type: v }))} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${eventForm.location_type === v ? '#0a0a0a' : 'var(--border)'}`, background: eventForm.location_type === v ? '#0a0a0a' : '#fff', color: eventForm.location_type === v ? '#fff' : 'var(--ink)', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 12.5, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
            {[
              ['Location / venue', 'location', '"Zoom" or address'],
              ['Join URL', 'join_url', 'https://…'],
              ['Capacity (leave blank for unlimited)', 'capacity', ''],
            ].map(([label, key, placeholder]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                <input value={eventForm[key]} onChange={e => setEventForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} type={key === 'capacity' ? 'number' : 'text'} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            {eventErr && <div style={{ fontSize: 12.5, color: '#c04040', marginBottom: 10 }}>{eventErr}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowCreateEvent(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createEvent} disabled={creatingEvent} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{creatingEvent ? 'Creating…' : 'Create event'}</button>
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
