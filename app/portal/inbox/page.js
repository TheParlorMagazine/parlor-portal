'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell from '../_components/PortalShell'
import { fieldCss } from '../_components/formCss'

function timeAgo(s) {
  if (!s) return ''
  const d = new Date(s); const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return 'just now'
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const css = `
  .ib-new { display:flex; justify-content:flex-end; margin-bottom:14px; }
  .ib-list { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:#fff; }
  .ib-thread { display:flex; gap:12px; align-items:flex-start; padding:16px 18px; border-bottom:1px solid var(--border); cursor:pointer; width:100%; text-align:left; background:none; border-left:none; border-right:none; border-top:none; font-family:'thermal-variable', Georgia, serif; }
  .ib-thread:last-child { border-bottom:none; }
  .ib-thread:hover { background:#fdf6f8; }
  .ib-thread.unread { background:#fdf1f4; }
  .ib-dot { width:8px; height:8px; border-radius:50%; margin-top:6px; flex-shrink:0; background:transparent; }
  .ib-thread.unread .ib-dot { background:var(--pink); }
  .ib-tbody { flex:1; min-width:0; }
  .ib-subject { font-size:14.5px; font-weight:600; color:var(--ink); margin-bottom:2px; }
  .ib-preview { font-size:13px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ib-time { font-size:12px; color:var(--muted); flex-shrink:0; }
  .ib-empty { text-align:center; padding:70px 24px; color:var(--muted); font-style:italic; }

  .ib-back { background:none; border:none; color:var(--muted); font-size:13px; cursor:pointer; font-family:'thermal-variable', Georgia, serif; margin-bottom:12px; padding:0; }
  .ib-back:hover { color:#000; }
  .ib-convo { border:1px solid var(--border); border-radius:12px; background:#fff; padding:20px; }
  .ib-convo-subject { font-family:'thermal-variable', Georgia, serif; font-size:18px; font-weight:600; margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid var(--border); }
  .ib-msgs { display:flex; flex-direction:column; gap:12px; margin-bottom:18px; max-height:52vh; overflow-y:auto; }
  .ib-msg { max-width:78%; padding:10px 14px; border-radius:12px; font-size:14px; line-height:1.5; }
  .ib-msg .ib-sender { font-size:11px; color:var(--muted); margin-bottom:3px; }
  .ib-msg.them { align-self:flex-start; background:#f3eef0; color:var(--ink); border-bottom-left-radius:3px; }
  .ib-msg.me { align-self:flex-end; background:var(--pink); color:#0a0a0a; border-bottom-right-radius:3px; }
  .ib-reply { display:flex; gap:8px; align-items:flex-end; }
  .ib-reply textarea { flex:1; padding:10px 13px; border:1px solid var(--border); border-radius:8px; font-family:'thermal-variable', Georgia, serif; font-size:14px; resize:vertical; outline:none; }
  .ib-reply textarea:focus { border-color:var(--pinkborder); }
`

function Inbox() {
  const supabase = createClient()
  const [view, setView] = useState('list') // list | thread | compose
  const [state, setState] = useState('loading')
  const [threads, setThreads] = useState([])
  const [active, setActive] = useState(null) // { thread, messages }
  const [reply, setReply] = useState('')
  const [subject, setSubject] = useState('')
  const [compose, setCompose] = useState('')
  const [busy, setBusy] = useState(false)
  const msgsRef = useRef(null)

  async function token() { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }

  async function loadThreads() {
    try {
      const res = await fetch('/api/portal/inbox', { headers: { Authorization: `Bearer ${await token()}` } })
      const data = await res.json()
      setThreads(data.threads || []); setState('ready')
    } catch { setState('error') }
  }
  useEffect(() => { loadThreads() }, [])

  async function openThread(t) {
    setView('thread'); setActive({ thread: t, messages: null })
    try {
      const res = await fetch(`/api/portal/inbox/${t.id}`, { headers: { Authorization: `Bearer ${await token()}` } })
      const data = await res.json()
      setActive({ thread: data.thread, messages: data.messages || [] })
      setThreads(list => list.map(x => x.id === t.id ? { ...x, member_unread: 0 } : x))
    } catch { setActive({ thread: t, messages: [] }) }
  }

  async function sendReply() {
    const text = reply.trim(); if (!text || !active) return
    setBusy(true)
    try {
      const res = await fetch(`/api/portal/inbox/${active.thread.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json()
      if (res.ok) { setActive(a => ({ ...a, messages: [...(a.messages || []), data.message] })); setReply('') }
    } finally { setBusy(false) }
    setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, 50)
  }

  async function startThread() {
    const text = compose.trim(); if (!text) return
    setBusy(true)
    try {
      const res = await fetch('/api/portal/inbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ subject, body: text }),
      })
      if (res.ok) { setSubject(''); setCompose(''); setView('list'); await loadThreads() }
    } finally { setBusy(false) }
  }

  return (
    <>
      <style>{fieldCss + css}</style>
      <h1 className="pg-title">Inbox</h1>
      <p className="pg-sub">Your private messages with The Parlor editors.</p>

      {view === 'list' && (
        <>
          <div className="ib-new"><button className="btn-primary" onClick={() => setView('compose')}>New message</button></div>
          {state === 'loading' && <div className="ib-empty">Loading…</div>}
          {state === 'ready' && (
            threads.length === 0
              ? <div className="ib-empty">No messages yet. Start a conversation with the editors.</div>
              : <div className="ib-list">
                  {threads.map(t => (
                    <button key={t.id} className={`ib-thread${t.member_unread > 0 ? ' unread' : ''}`} onClick={() => openThread(t)}>
                      <span className="ib-dot" />
                      <span className="ib-tbody">
                        <span className="ib-subject">{t.subject || 'Conversation'}</span>
                        <span className="ib-preview">{t.last_message_preview || ''}</span>
                      </span>
                      <span className="ib-time">{timeAgo(t.last_message_at)}</span>
                    </button>
                  ))}
                </div>
          )}
        </>
      )}

      {view === 'compose' && (
        <div className="pg-card">
          <button className="ib-back" onClick={() => setView('list')}>← Back to inbox</button>
          <label className="fld"><span>Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" />
          </label>
          <label className="fld"><span>Message</span>
            <textarea rows={5} value={compose} onChange={e => setCompose(e.target.value)} placeholder="Write your message to the editors…" />
          </label>
          <div className="pg-actions">
            <button className="btn-primary" onClick={startThread} disabled={busy || !compose.trim()}>{busy ? 'Sending…' : 'Send message'}</button>
          </div>
        </div>
      )}

      {view === 'thread' && active && (
        <div>
          <button className="ib-back" onClick={() => { setView('list'); loadThreads() }}>← Back to inbox</button>
          <div className="ib-convo">
            <div className="ib-convo-subject">{active.thread?.subject || 'Conversation'}</div>
            <div className="ib-msgs" ref={msgsRef}>
              {active.messages === null ? <div className="ib-empty">Loading…</div> :
                active.messages.map(m => (
                  <div key={m.id} className={`ib-msg ${m.sender_type === 'member' ? 'me' : 'them'}`}>
                    {m.sender_type !== 'member' && <div className="ib-sender">{m.sender_name || 'The Parlor'}</div>}
                    {m.body}
                  </div>
                ))}
            </div>
            <div className="ib-reply">
              <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }} />
              <button className="btn-primary" onClick={sendReply} disabled={busy || !reply.trim()}>Send</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function InboxPage() {
  return <PortalShell active="inbox"><Inbox /></PortalShell>
}
