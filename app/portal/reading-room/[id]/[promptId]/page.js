'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase'
import PortalShell from '../../../_components/PortalShell'
import { rrCss } from '../../rrCss'
import { alertDialog } from '../../../../../lib/confirmDialog'

function timeAgo(iso) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const UP = <svg viewBox="0 0 12 12" fill="none"><path d="M6 2l4 6H2z" fill="currentColor"/></svg>
function Av({ name, src, sm }) { return <div className={`rr-av${sm ? ' sm' : ''}`}>{src ? <img src={src} alt="" /> : (name || 'M')[0].toUpperCase()}</div> }

function Prompt() {
  const { id, promptId } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [d, setD] = useState({ loading: true, book: null, prompt: null, replies: [] })
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/prompts/${promptId}`, { headers: await auth() })
      if (!res.ok) { setD({ loading: false, book: null, prompt: null, replies: [] }); return }
      const j = await res.json()
      setD({ loading: false, book: j.book, prompt: j.prompt, replies: j.replies || [] })
    } catch { setD({ loading: false, book: null, prompt: null, replies: [] }) }
  }, [promptId, auth])
  useEffect(() => { load() }, [load])

  async function vote() {
    setD(s => ({ ...s, prompt: { ...s.prompt, upvoted: !s.prompt.upvoted, upvote_count: s.prompt.upvote_count + (s.prompt.upvoted ? -1 : 1) } }))
    const res = await fetch(`/api/portal/prompts/${promptId}/vote`, { method: 'POST', headers: await auth() })
    if (res.ok) { const j = await res.json(); setD(s => ({ ...s, prompt: { ...s.prompt, upvoted: j.upvoted, upvote_count: j.upvote_count } })) }
  }
  async function post() {
    if (!reply.trim() || busy) return
    setBusy(true)
    const res = await fetch(`/api/portal/prompts/${promptId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ body: reply.trim() }) })
    setBusy(false)
    if (res.ok) { const j = await res.json(); setD(s => ({ ...s, replies: [...s.replies, j.reply] })); setReply('') }
  }
  async function report(kind, rid) {
    const reason = prompt('Report this — why? (optional)')
    if (reason === null) return
    const res = await fetch('/api/portal/forum-report', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ kind, id: rid, reason }) })
    if (res.ok) alertDialog('Thanks — a moderator will take a look.')
  }

  if (d.loading) return <div className="rr-wrap"><style>{rrCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!d.prompt) return <div className="rr-wrap"><style>{rrCss}</style><a className="rr-back" href={`/portal/reading-room/${id}`}>← Back</a><div className="rr-empty">This discussion isn’t available, or it’s for paid members.</div></div>

  const p = d.prompt
  return (
    <div className="rr-wrap">
      <style>{rrCss}</style>
      <a className="rr-back" href={`/portal/reading-room/${id}`}>← {d.book?.title || 'Book'}</a>

      <div className="rr-op">
        <div className="rr-op-head">
          <Av name={p.author_name} src={p.author_avatar} />
          <div>
            <div className="rr-name">{p.author_name}<span className="rr-editor-tag">Editor prompt</span></div>
            <div className="rr-time">{timeAgo(p.created_at)}</div>
          </div>
          <button className={`rr-votes${p.upvoted ? ' on' : ''}`} style={{ marginLeft: 'auto' }} onClick={vote}>{UP} {p.upvote_count}</button>
        </div>
        <div className="rr-op-title">{p.title}</div>
        {p.body && <div className="rr-op-body">{p.body}</div>}
      </div>

      <div style={{ fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--muted)', padding: '2px 0 12px' }}>Responses</div>
      {d.replies.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14, fontStyle: 'italic', marginBottom: 20 }}>No responses yet — share your take.</p>
      ) : (
        <div style={{ marginBottom: 22 }}>
          {d.replies.map(r => (
            <div className="rr-reply" key={r.id}>
              <Av name={r.author_name} src={r.author_avatar} sm />
              <div>
                <div className="rr-reply-head">
                  <span className="rr-name">{r.author_name}</span>
                  <span className="rr-time">{timeAgo(r.created_at)}</span>
                  <button className="rr-linkbtn" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => report('book_reply', r.id)}>Report</button>
                </div>
                <div className="rr-reply-body">{r.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rr-composer">
        <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Share your response…" />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="rr-postbtn" onClick={post} disabled={!reply.trim() || busy}>{busy ? 'Posting…' : 'Post response'}</button>
        </div>
      </div>
    </div>
  )
}

export default function PromptPage() {
  return <PortalShell active="readingroom"><Prompt /></PortalShell>
}
