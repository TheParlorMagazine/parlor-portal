'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'

function timeAgo(s) {
  if (!s) return ''
  const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (sec < 60) return 'now'
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function InboxModal({ open, onClose, onChange }) {
  const supabase = createClient()
  const [threads, setThreads] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [active, setActive] = useState(null) // {thread, messages}
  const [mode, setMode] = useState('read') // read | compose
  const [reply, setReply] = useState('')
  const [subject, setSubject] = useState('')
  const [compose, setCompose] = useState('')
  const [busy, setBusy] = useState(false)
  // admin composer
  const [audience, setAudience] = useState('all')
  const [recipient, setRecipient] = useState(null)
  const [mQuery, setMQuery] = useState('')
  const [mResults, setMResults] = useState([])
  const [sentMsg, setSentMsg] = useState('')

  async function token() { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
  async function loadThreads() {
    try {
      const res = await fetch('/api/portal/inbox', { headers: { Authorization: `Bearer ${await token()}` } })
      const data = await res.json(); setThreads(data.threads || []); setIsAdmin(!!data.isAdmin)
    } catch {}
  }

  useEffect(() => {
    if (!open) return
    setActive(null); setMode('read'); loadThreads()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function openThread(t) {
    setMode('read'); setActive({ thread: t, messages: null })
    try {
      const res = await fetch(`/api/portal/inbox/${t.id}`, { headers: { Authorization: `Bearer ${await token()}` } })
      const data = await res.json()
      setActive({ thread: { ...data.thread, member_name: t.member_name }, messages: data.messages || [] })
      if (t.member_unread > 0) { onChange && onChange(-t.member_unread); setThreads(l => l.map(x => x.id === t.id ? { ...x, member_unread: 0 } : x)) }
    } catch { setActive({ thread: t, messages: [] }) }
  }

  async function sendReply() {
    const text = reply.trim(); if (!text || !active) return
    setBusy(true)
    try {
      const res = await fetch(`/api/portal/inbox/${active.thread.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ body: text }) })
      const data = await res.json()
      if (res.ok) { setActive(a => ({ ...a, messages: [...(a.messages || []), data.message] })); setReply('') }
    } finally { setBusy(false) }
  }

  async function startThread() {
    const text = compose.trim(); if (!text) return
    setBusy(true)
    try {
      const res = await fetch('/api/portal/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ subject, body: text }) })
      if (res.ok) { setSubject(''); setCompose(''); setMode('read'); await loadThreads() }
    } finally { setBusy(false) }
  }

  // Admin member search (for "send to an individual")
  useEffect(() => {
    if (!isAdmin || !mQuery.trim()) { setMResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portal/inbox/admin-compose?q=${encodeURIComponent(mQuery.trim())}`, { headers: { Authorization: `Bearer ${await token()}` } })
        const data = await res.json()
        if (!cancelled) setMResults(data.members || [])
      } catch {}
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [mQuery, isAdmin])

  async function sendAdminMessage() {
    const text = compose.trim(); if (!text) return
    setBusy(true); setSentMsg('')
    try {
      const payload = recipient ? { audience: 'individual', memberId: recipient.id, subject, body: text } : { audience, subject, body: text }
      const res = await fetch('/api/portal/inbox/admin-compose', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (res.ok) { setSentMsg(`Sent to ${data.sent} member${data.sent === 1 ? '' : 's'}.`); setCompose(''); setSubject(''); setRecipient(null); setMQuery(''); await loadThreads() }
      else setSentMsg(data.error || 'Couldn’t send.')
    } finally { setBusy(false) }
  }

  if (!open) return null

  return (
    <>
      <style>{`
        .im-bg{position:fixed;inset:0;background:rgba(26,23,16,0.5);z-index:200;display:flex;align-items:center;justify-content:center}
        .im-modal{background:var(--paper);border:1px solid var(--border);border-radius:13px;width:860px;max-width:96vw;height:78vh;max-height:680px;display:flex;overflow:hidden}
        .im-list{width:290px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
        .im-list-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .im-list-title{font-size:16px;font-weight:600;color:var(--ink)}
        .im-compose-btn{display:inline-flex;align-items:center;gap:5px;background:var(--ink);color:#fff;border:none;border-radius:7px;padding:6px 12px;font-size:11.5px;font-weight:500;cursor:pointer;font-family:'thermal-variable',Georgia,serif}
        .im-close{background:none;border:none;font-size:22px;color:var(--muted);cursor:pointer;line-height:1;padding:0 2px}
        .im-close:hover{color:var(--ink)}
        .im-threads{overflow-y:auto;flex:1}
        .im-thread{padding:13px 18px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s;width:100%;text-align:left;background:none;border-left:none;border-right:none;border-top:none;font-family:'thermal-variable',Georgia,serif}
        .im-thread:hover{background:var(--cream)}
        .im-thread.active{background:#fce8ec}
        .im-thread.unread{background:#fef9fa}
        .im-thread-row{display:flex;align-items:center;gap:8px;margin-bottom:3px}
        .im-thread-subj{font-size:12.5px;font-weight:600;color:var(--ink);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .im-thread-time{font-size:10px;color:var(--muted);flex-shrink:0}
        .im-thread-prev{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .im-udot{width:6px;height:6px;border-radius:50%;background:var(--pink);flex-shrink:0}
        .im-empty-list{padding:34px 18px;text-align:center;color:var(--muted);font-style:italic;font-size:13px}
        .im-reader{flex:1;min-width:0;display:flex;flex-direction:column}
        .im-reader-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-style:italic;font-size:14px;padding:20px}
        .im-reader-head{padding:16px 20px;border-bottom:1px solid var(--border);font-size:15px;font-weight:600;flex-shrink:0}
        .im-msgs{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:11px}
        .im-msg{max-width:80%;padding:9px 13px;border-radius:12px;font-size:13.5px;line-height:1.5}
        .im-msg .im-sender{font-size:10.5px;color:var(--muted);margin-bottom:3px}
        .im-msg.them{align-self:flex-start;background:#f3eef0;color:var(--ink);border-bottom-left-radius:3px}
        .im-msg.me{align-self:flex-end;background:var(--pink);color:#0a0a0a;border-bottom-right-radius:3px}
        .im-replybar{border-top:1px solid var(--border);padding:12px;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}
        .im-replybar textarea{flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:'thermal-variable',Georgia,serif;font-size:13.5px;resize:none;outline:none}
        .im-replybar textarea:focus{border-color:var(--pinkborder)}
        .im-send{background:var(--ink);color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer;font-family:'thermal-variable',Georgia,serif}
        .im-compose{flex:1;padding:22px;display:flex;flex-direction:column;gap:12px}
        .im-compose input,.im-compose textarea{padding:10px 13px;border:1px solid var(--border);border-radius:8px;font-family:'thermal-variable',Georgia,serif;font-size:14px;outline:none}
        .im-compose textarea{flex:1;resize:none}
        .im-compose-actions{display:flex;gap:8px;align-items:center}
        .im-compose-title{font-size:19px;font-weight:600;font-family:'thermal-variable',Georgia,serif}
        .im-compose-desc{font-size:13px;color:var(--muted);margin-top:-6px}
        .im-seg-label{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:500}
        .im-seg-chips{display:flex;gap:8px;flex-wrap:wrap}
        .im-seg-chip{font-size:12.5px;padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:none;color:var(--ink);cursor:pointer;font-family:'thermal-variable',Georgia,serif}
        .im-seg-chip:hover{border-color:var(--pinkborder)}
        .im-seg-chip.active{background:var(--ink);color:#fff;border-color:var(--ink)}
        .im-or{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);text-align:center;margin:2px 0}
        .im-search-wrap{position:relative}
        .im-search-results{position:absolute;top:calc(100% + 2px);left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.1);z-index:5;max-height:180px;overflow-y:auto}
        .im-search-result{padding:9px 13px;cursor:pointer;font-size:13.5px;border-bottom:1px solid var(--border)}
        .im-search-result:hover{background:var(--cream)}
        .im-recipient-pill{display:inline-flex;align-items:center;gap:8px;background:#fce8ec;border-radius:20px;padding:5px 12px;font-size:13px}
        .im-recipient-pill button{background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;line-height:1}
        .im-sent{font-size:13px;color:#2e7d46}
        @media(max-width:720px){.im-modal{flex-direction:column;height:90vh}.im-list{width:100%;height:200px;border-right:none;border-bottom:1px solid var(--border)}}
      `}</style>
      <div className="im-bg" onClick={onClose}>
        <div className="im-modal" onClick={e => e.stopPropagation()}>
          <div className="im-list">
            <div className="im-list-head">
              <div className="im-list-title">Inbox</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="im-compose-btn" onClick={() => { setActive(null); setMode('compose') }}>+ Compose</button>
                <button className="im-close" onClick={onClose}>×</button>
              </div>
            </div>
            <div className="im-threads">
              {threads.length === 0 && <div className="im-empty-list">No messages yet.</div>}
              {threads.map(t => (
                <button key={t.id} className={`im-thread${active?.thread?.id === t.id ? ' active' : ''}${t.member_unread > 0 ? ' unread' : ''}`} onClick={() => openThread(t)}>
                  <div className="im-thread-row">
                    <span className="im-thread-subj">{isAdmin && t.member_name ? t.member_name : (t.subject || 'Conversation')}</span>
                    <span className="im-thread-time">{timeAgo(t.last_message_at)}</span>
                    {t.member_unread > 0 && <span className="im-udot" />}
                  </div>
                  <div className="im-thread-prev">{isAdmin && t.member_name ? (t.subject || t.last_message_preview) : (t.last_message_preview || '')}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="im-reader">
            {mode === 'compose' && isAdmin ? (
              <div className="im-compose" style={{ overflowY: 'auto' }}>
                <div className="im-compose-title">Send a message</div>
                <div className="im-compose-desc">Compose a message to a group or individual member.</div>
                <div className="im-seg-label">Send to group</div>
                <div className="im-seg-chips">
                  {[['all', 'All members'], ['readers_circle', "Reader's Circle"], ['printing_press', 'Printing Press'], ['free', 'Free subscribers']].map(([v, l]) => (
                    <button key={v} className={`im-seg-chip${!recipient && audience === v ? ' active' : ''}`} onClick={() => { setAudience(v); setRecipient(null); setMQuery('') }}>{l}</button>
                  ))}
                </div>
                <div className="im-or">— or send to an individual —</div>
                {recipient ? (
                  <span className="im-recipient-pill">{recipient.full_name}<button onClick={() => setRecipient(null)}>×</button></span>
                ) : (
                  <div className="im-search-wrap">
                    <input value={mQuery} onChange={e => setMQuery(e.target.value)} placeholder="Search member by name…" />
                    {mResults.length > 0 && (
                      <div className="im-search-results">
                        {mResults.map(m => <div key={m.id} className="im-search-result" onClick={() => { setRecipient(m); setMResults([]); setMQuery('') }}>{m.full_name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>{m.email}</span></div>)}
                      </div>
                    )}
                  </div>
                )}
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
                <textarea value={compose} onChange={e => setCompose(e.target.value)} placeholder="Write your message…" />
                <div className="im-compose-actions">
                  <button className="im-send" onClick={sendAdminMessage} disabled={busy || !compose.trim()}>{busy ? 'Sending…' : 'Send message'}</button>
                  <button className="im-close" style={{ fontSize: 13, color: 'var(--muted)' }} onClick={() => { setMode('read'); setSentMsg('') }}>Cancel</button>
                  {sentMsg && <span className="im-sent">{sentMsg}</span>}
                </div>
              </div>
            ) : mode === 'compose' ? (
              <div className="im-compose">
                <div style={{ fontSize: 15, fontWeight: 600 }}>New message to the editors</div>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
                <textarea value={compose} onChange={e => setCompose(e.target.value)} placeholder="Write your message…" />
                <div className="im-compose-actions">
                  <button className="im-send" onClick={startThread} disabled={busy || !compose.trim()}>{busy ? 'Sending…' : 'Send'}</button>
                  <button className="im-close" style={{ fontSize: 13, color: 'var(--muted)' }} onClick={() => setMode('read')}>Cancel</button>
                </div>
              </div>
            ) : !active ? (
              <div className="im-reader-empty">Select a message to read it</div>
            ) : (
              <>
                <div className="im-reader-head">{isAdmin && active.thread?.member_name ? `${active.thread.member_name} · ${active.thread?.subject || 'Conversation'}` : (active.thread?.subject || 'Conversation')}</div>
                <div className="im-msgs">
                  {active.messages === null ? <div className="im-reader-empty">Loading…</div> :
                    active.messages.map(m => {
                      const mine = isAdmin ? m.sender_type === 'admin' : m.sender_type !== 'admin'
                      return (
                        <div key={m.id} className={`im-msg ${mine ? 'me' : 'them'}`}>
                          {!mine && <div className="im-sender">{m.sender_name || 'The Parlor'}</div>}
                          {m.body}
                        </div>
                      )
                    })}
                </div>
                <div className="im-replybar">
                  <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }} />
                  <button className="im-send" onClick={sendReply} disabled={busy || !reply.trim()}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
