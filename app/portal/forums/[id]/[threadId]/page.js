'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase'
import PortalShell from '../../../_components/PortalShell'
import { forumCss } from '../../forumCss'

function timeAgo(iso) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const UP = <svg viewBox="0 0 12 12" fill="none"><path d="M6 2l4 6H2z" fill="currentColor"/></svg>
function Av({ name, src, sm }) {
  return <div className={`fr-av${sm ? ' sm' : ''}`}>{src ? <img src={src} alt="" /> : (name || 'M')[0].toUpperCase()}</div>
}

function Thread() {
  const { id, threadId } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [d, setD] = useState({ loading: true, forum: null, thread: null, replies: [] })
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/threads/${threadId}`, { headers: await auth() })
      if (!res.ok) { setD({ loading: false, forum: null, thread: null, replies: [] }); return }
      const j = await res.json()
      setD({ loading: false, forum: j.forum, thread: j.thread, replies: j.replies || [] })
    } catch { setD({ loading: false, forum: null, thread: null, replies: [] }) }
  }, [threadId, auth])

  useEffect(() => { load() }, [load])

  async function vote() {
    setD(s => ({ ...s, thread: { ...s.thread, upvoted: !s.thread.upvoted, upvote_count: s.thread.upvote_count + (s.thread.upvoted ? -1 : 1) } }))
    const res = await fetch(`/api/portal/threads/${threadId}/vote`, { method: 'POST', headers: await auth() })
    if (res.ok) { const j = await res.json(); setD(s => ({ ...s, thread: { ...s.thread, upvoted: j.upvoted, upvote_count: j.upvote_count } })) }
  }

  async function postReply() {
    if (!reply.trim() || busy) return
    setBusy(true)
    const res = await fetch(`/api/portal/threads/${threadId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) },
      body: JSON.stringify({ body: reply.trim() }),
    })
    setBusy(false)
    if (res.ok) { const j = await res.json(); setD(s => ({ ...s, replies: [...s.replies, j.reply] })); setReply('') }
  }

  async function report(kind, rid) {
    const reason = prompt('Report this post — why? (optional)')
    if (reason === null) return
    const res = await fetch('/api/portal/forum-report', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ kind, id: rid, reason }) })
    if (res.ok) alert('Thanks — a moderator will take a look.')
  }

  if (d.loading) return <div className="fr-wrap"><style>{forumCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!d.thread) return (
    <div className="fr-wrap"><style>{forumCss}</style>
      <a className="fr-back" href="/portal/forums">← Forums</a>
      <div className="fr-empty">This thread isn’t available, or you’re not a member of its forum.</div>
    </div>
  )

  const t = d.thread
  return (
    <div className="fr-wrap">
      <style>{forumCss}</style>
      <a className="fr-back" href={`/portal/forums/${id}`}>← {d.forum?.name || 'Forum'}</a>

      <div className="fr-op">
        <div className="fr-op-head">
          <Av name={t.author_name} src={t.author_avatar} />
          <div>
            <div className="fr-name">{t.author_name}</div>
            <div className="fr-time">{timeAgo(t.created_at)}</div>
          </div>
          <button className={`fr-votes${t.upvoted ? ' on' : ''}`} style={{ marginLeft: 'auto' }} onClick={vote}>{UP} {t.upvote_count}</button>
        </div>
        <div className="fr-op-title">{t.title}</div>
        {t.body && <div className="fr-op-body">{t.body}</div>}
        <div className="fr-op-actions">
          <span className="fr-time">{t.reply_count} repl{t.reply_count === 1 ? 'y' : 'ies'}</span>
          <button className="fr-linkbtn" style={{ marginLeft: 'auto' }} onClick={() => report('thread', t.id)}>Report</button>
        </div>
      </div>

      <div className="fr-replies-label">Replies</div>
      {d.replies.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14, fontStyle: 'italic', marginBottom: 20 }}>No replies yet — be the first.</p>
      ) : (
        <div style={{ marginBottom: 22 }}>
          {d.replies.map(r => (
            <div className="fr-reply" key={r.id}>
              <Av name={r.author_name} src={r.author_avatar} sm />
              <div>
                <div className="fr-reply-head">
                  <span className="fr-name">{r.author_name}</span>
                  <span className="fr-time">{timeAgo(r.created_at)}</span>
                  <button className="fr-linkbtn" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => report('reply', r.id)}>Report</button>
                </div>
                <div className="fr-reply-body">{r.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fr-composer">
        <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Write a reply…" />
        <div className="fr-composer-row">
          <button className="fr-postbtn" onClick={postReply} disabled={!reply.trim() || busy}>{busy ? 'Posting…' : 'Post reply'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ThreadPage() {
  return <PortalShell active="groups"><Thread /></PortalShell>
}
