'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import PortalShell from '../../_components/PortalShell'
import PostGuidelines from '../../_components/PostGuidelines'
import { forumCss } from '../forumCss'

function timeAgo(iso) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const UP = <svg viewBox="0 0 12 12" fill="none"><path d="M6 2l4 6H2z" fill="currentColor"/></svg>
function Av({ name, src }) {
  return <div className="fr-av">{src ? <img src={src} alt="" /> : (name || 'M')[0].toUpperCase()}</div>
}

function ModPanel({ id, auth }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ requests: [], members: [], policy: 'request' })
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteLinks, setInviteLinks] = useState([])
  const [inviting, setInviting] = useState(false)

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
    if (res.ok) { const d = await res.json(); setData({ requests: d.requests || [], members: d.members || [], policy: d.group?.join_policy || 'request' }) }
  }, [id, auth])
  useEffect(() => { if (open) load() }, [open, load])

  async function setPolicy(p) { setData(s => ({ ...s, policy: p })); await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ join_policy: p }) }) }
  async function respond(mid, action) {
    await fetch(`/api/portal/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ request_member_id: mid, action }) })
    setData(s => ({ ...s, requests: s.requests.filter(r => r.member_id !== mid) }))
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20, background: '#fff' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '13px 16px', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>⚙ Manage forum{data.requests.length > 0 ? <span style={{ color: '#c4364a' }}> · {data.requests.length} request{data.requests.length === 1 ? '' : 's'}</span> : ''}</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{open ? 'Hide' : 'Open'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
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
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>{data.members.length} member{data.members.length === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  )
}

function Detail() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState({ loading: true, forum: null, threads: [] })
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/forums/${id}`, { headers: await auth() })
      if (!res.ok) { setData({ loading: false, forum: null, threads: [] }); return }
      const d = await res.json()
      setData({ loading: false, forum: d.forum, threads: d.threads || [] })
    } catch { setData({ loading: false, forum: null, threads: [] }) }
  }, [id, auth])

  useEffect(() => { load() }, [load])

  async function vote(t) {
    // optimistic
    setData(s => ({ ...s, threads: s.threads.map(x => x.id === t.id ? { ...x, upvoted: !x.upvoted, upvote_count: x.upvote_count + (x.upvoted ? -1 : 1) } : x) }))
    const res = await fetch(`/api/portal/threads/${t.id}/vote`, { method: 'POST', headers: await auth() })
    if (res.ok) { const d = await res.json(); setData(s => ({ ...s, threads: s.threads.map(x => x.id === t.id ? { ...x, upvoted: d.upvoted, upvote_count: d.upvote_count } : x) })) }
  }

  async function createThread() {
    if (!title.trim() || busy) return
    setBusy(true)
    const res = await fetch(`/api/portal/forums/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) },
      body: JSON.stringify({ title: title.trim(), body: body.trim() }),
    })
    setBusy(false)
    if (res.ok) { const d = await res.json(); router.push(`/portal/forums/${id}/${d.thread_id}`) }
  }

  if (data.loading) return <div className="fr-wrap"><style>{forumCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!data.forum) return (
    <div className="fr-wrap"><style>{forumCss}</style>
      <a className="fr-back" href="/portal/forums">← Forums</a>
      <div className="fr-empty">This forum isn’t available, or you’re not a member.</div>
    </div>
  )

  const f = data.forum
  return (
    <div className="fr-wrap">
      <style>{forumCss}</style>
      <a className="fr-back" href="/portal/forums">← Forums</a>
      <div className="fr-topbar">
        <div>
          <h1 className="fr-h1">{f.name}</h1>
          {f.description && <p className="fr-sub" style={{ margin: 0 }}>{f.description}</p>}
        </div>
        <button className="fr-newbtn" onClick={() => { setShowNew(true); setAgreed(false) }}>+ New thread</button>
      </div>

      {f.my_role === 'host' && <ModPanel id={id} auth={auth} />}

      {f.guidelines && (
        <div className="fr-guide">
          <div className="fr-guide-title">Room guidelines</div>
          <div className="fr-guide-body">{f.guidelines}</div>
        </div>
      )}

      {data.threads.length === 0 ? (
        <div className="fr-empty"><strong style={{ color: 'var(--ink)' }}>No threads yet.</strong><br />Start the first conversation.</div>
      ) : (
        <div className="fr-threads">
          {data.threads.map(t => {
            const href = `/portal/forums/${id}/${t.id}`
            return (
              <div className="fr-thread" key={t.id}>
                <Av name={t.author_name} src={t.author_avatar} />
                <div className="fr-thread-body">
                  {t.pinned && <div className="fr-pin">Pinned</div>}
                  <a href={href}><div className="fr-thread-title">{t.title}</div></a>
                  {t.excerpt && <div className="fr-thread-excerpt">{t.excerpt}</div>}
                  <div className="fr-thread-meta"><b>{t.author_name}</b> · {timeAgo(t.last_activity_at || t.created_at)}</div>
                </div>
                <div className="fr-stats">
                  <button className={`fr-votes${t.upvoted ? ' on' : ''}`} onClick={() => vote(t)}>{UP} {t.upvote_count}</button>
                  <a className="fr-replies" href={href}>{t.reply_count} repl{t.reply_count === 1 ? 'y' : 'ies'}</a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && (
        <div className="fr-modal-bg" onClick={() => setShowNew(false)}>
          <div className="fr-modal" onClick={e => e.stopPropagation()}>
            <div className="fr-modal-title">Start a new thread</div>
            <PostGuidelines agreed={agreed} onAgree={setAgreed} />
            <input className="fr-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What’s on your mind?" autoFocus />
            <textarea className="fr-input" value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Share what you’re thinking, a question, a passage that struck you… (optional)" style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button className="fr-linkbtn" onClick={() => { setShowNew(false); setAgreed(false) }}>Cancel</button>
              <button className="fr-postbtn" onClick={createThread} disabled={!title.trim() || busy || !agreed}>{busy ? 'Posting…' : 'Post thread'}</button>
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
