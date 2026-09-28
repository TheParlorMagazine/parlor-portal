'use client'

import { useState, useEffect } from 'react'

const ff = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const BORDER = '#e5e0e2'

function useToken(supabase) {
  return async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
}

// ── Private messages (admin view of member ↔ editor inbox) ──
function MessagesTab({ token }) {
  const [threads, setThreads] = useState([])
  const [active, setActive] = useState(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await fetch('/api/portal/inbox', { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json(); setThreads(d.threads || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function open(t) {
    setActive({ thread: t, messages: null })
    const res = await fetch(`/api/portal/inbox/${t.id}`, { headers: { Authorization: `Bearer ${await token()}` } })
    const d = await res.json()
    setActive({ thread: { ...d.thread, member_name: t.member_name }, messages: d.messages || [] })
  }
  async function send() {
    const text = reply.trim(); if (!text || !active) return
    setBusy(true)
    try {
      const res = await fetch(`/api/portal/inbox/${active.thread.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ body: text }) })
      const d = await res.json()
      if (res.ok) { setActive(a => ({ ...a, messages: [...(a.messages || []), d.message] })); setReply(''); load() }
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 0, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', height: 560, background: '#fff' }}>
      <div style={{ width: 300, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', flexShrink: 0 }}>
        {loading && <div style={{ padding: 24, color: '#999', fontStyle: 'italic', fontSize: 13 }}>Loading…</div>}
        {!loading && threads.length === 0 && <div style={{ padding: 24, color: '#999', fontStyle: 'italic', fontSize: 13 }}>No member messages yet.</div>}
        {threads.map(t => (
          <button key={t.id} onClick={() => open(t)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: `1px solid ${BORDER}`, background: active?.thread?.id === t.id ? '#fce8ec' : (t.member_unread > 0 ? '#fdf6f8' : 'none'), padding: '13px 16px', cursor: 'pointer', fontFamily: ff }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>{t.member_name || 'Member'}</div>
            <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || t.last_message_preview}</div>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontStyle: 'italic', fontSize: 14 }}>Select a conversation</div>
        ) : (
          <>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, fontSize: 15, fontWeight: 600 }}>{active.thread?.member_name} · {active.thread?.subject || 'Conversation'}</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.messages === null ? <div style={{ color: '#999', fontStyle: 'italic' }}>Loading…</div> :
                active.messages.map(m => {
                  const mine = m.sender_type === 'admin'
                  return (
                    <div key={m.id} style={{ maxWidth: '80%', alignSelf: mine ? 'flex-end' : 'flex-start', background: mine ? PINK : '#f3eef0', color: '#0a0a0a', padding: '9px 13px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5 }}>
                      {!mine && <div style={{ fontSize: 10.5, color: '#888', marginBottom: 3 }}>{m.sender_name}</div>}
                      {m.body}
                    </div>
                  )
                })}
            </div>
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply as the editors…" style={{ flex: 1, padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 13.5, resize: 'none', outline: 'none' }} />
              <button onClick={send} disabled={busy || !reply.trim()} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: ff }}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Inbox broadcasts (segmented message to members' inboxes) ──
const SEGMENTS = [
  ['all', 'All subscribers'],
  ['readers_circle', "Reader's Circle"],
  ['printing_press', 'Printing Press'],
  ['event_attendees', 'Event attendees'],
]
const SEGMENT_LABEL = Object.fromEntries(SEGMENTS)

function fmtWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function CreateBroadcastModal({ token, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [audience, setAudience] = useState('all')   // computed key, or `seg:<id>`
  const [customSegs, setCustomSegs] = useState([])
  const [eventTiming, setEventTiming] = useState('upcoming') // upcoming | past
  const [eventRef, setEventRef] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [when, setWhen] = useState('now')
  const [at, setAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const [events, setEvents] = useState([])
  useEffect(() => {
    (async () => {
      const h = { headers: { Authorization: `Bearer ${await token()}` } }
      try { const d = await (await fetch('/api/admin/segments', h)).json(); setCustomSegs(d.custom || []) } catch {}
      try { const d = await (await fetch('/api/admin/events', h)).json(); setEvents(d.events || []) } catch {}
    })()
  }, [])

  async function submit() {
    if (!name.trim() || !body.trim()) { setMsg({ ok: false, text: 'Name and message are required.' }); return }
    if (when === 'scheduled' && !at) { setMsg({ ok: false, text: 'Pick a send time.' }); return }
    setBusy(true); setMsg(null)
    try {
      const isCustom = audience.startsWith('seg:')
      const payload = {
        name, subject, body, schedule_type: when,
        scheduled_at: when === 'scheduled' ? new Date(at).toISOString() : null,
        event_ref: audience === 'event_attendees' ? (eventRef || null) : null,
        ...(isCustom ? { segment_id: audience.slice(4) } : { segment: audience }),
      }
      const res = await fetch('/api/portal/broadcasts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (res.ok) { onCreated(); onClose() }
      else setMsg({ ok: false, text: d.error || 'Couldn’t save.' })
    } finally { setBusy(false) }
  }

  const input = { width: '100%', padding: '11px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, outline: 'none' }
  const chip = (active) => ({ fontSize: 12.5, padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? '#0a0a0a' : BORDER}`, background: active ? '#0a0a0a' : 'none', color: active ? '#fff' : '#0a0a0a', cursor: 'pointer', fontFamily: ff })
  const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '16px 0 8px' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 720, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', padding: 28, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: ffH, fontSize: 22, fontWeight: 700 }}>Create broadcast</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>Delivers a message to each recipient’s portal inbox (as the editors).</p>

        <div style={label}>Broadcast name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. October print-issue announcement" style={input} />

        <div style={label}>Segment</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SEGMENTS.map(([v, l]) => <button key={v} onClick={() => setAudience(v)} style={chip(audience === v)}>{l}</button>)}
          {customSegs.map(s => (
            <button key={s.id} onClick={() => setAudience(`seg:${s.id}`)} style={chip(audience === `seg:${s.id}`)}>
              {s.name}{typeof s.member_count === 'number' ? ` · ${s.member_count}` : ''}
            </button>
          ))}
        </div>
        {audience === 'event_attendees' && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={eventTiming} onChange={e => { setEventTiming(e.target.value); setEventRef('') }} style={{ ...input, width: 'auto', padding: '8px 12px' }}>
                <option value="upcoming">Upcoming events</option>
                <option value="past">Past events</option>
              </select>
              <select value={eventRef} onChange={e => setEventRef(e.target.value)} style={{ ...input, width: 'auto', padding: '8px 12px' }}>
                <option value="">All {eventTiming} events</option>
                {events
                  .filter(ev => { const t = ev.starts_at ? new Date(ev.starts_at).getTime() : 0; return eventTiming === 'past' ? t < Date.now() : t >= Date.now() })
                  .map(ev => <option key={ev.id} value={ev.id}>{ev.title} ({ev.going_count || 0} going)</option>)}
              </select>
            </div>
            {events.length === 0 && <p style={{ fontSize: 12.5, color: '#b26a00', marginTop: 8 }}>No events yet — create one in Community → Events to target attendees.</p>}
          </div>
        )}
        {customSegs.length === 0 && <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>Create custom segments (e.g. “Democracy Salons”) under Emails → Segments to target them here.</p>}

        <div style={label}>Timing</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setWhen('now')} style={chip(when === 'now')}>Send now</button>
          <button onClick={() => setWhen('scheduled')} style={chip(when === 'scheduled')}>Schedule</button>
          <button onClick={() => setWhen('event')} style={chip(when === 'event')}>On event</button>
          {when === 'scheduled' && <input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} style={{ ...input, width: 'auto' }} />}
        </div>
        {when === 'event' && <p style={{ fontSize: 12.5, color: '#b26a00', marginTop: 8 }}>Event triggers activate once Events + registration exist — saved as pending until then.</p>}

        <div style={label}>Subject</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={input} />
        <div style={label}>Message</div>
        <textarea rows={7} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message…" style={{ ...input, resize: 'vertical' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <button onClick={submit} disabled={busy} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>
            {busy ? 'Saving…' : when === 'now' ? 'Send broadcast' : 'Schedule broadcast'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', fontFamily: ff }}>Cancel</button>
          {msg && <span style={{ fontSize: 13, color: msg.ok ? '#2e7d46' : '#b23b3b' }}>{msg.text}</span>}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { sent: ['#2e7d46', '#e8f5ec'], scheduled: ['#7a5b00', '#fdf3d8'], draft: ['#666', '#eee'] }
  const [c, bg] = map[status] || map.draft
  return <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: c, background: bg, padding: '3px 9px', borderRadius: 20 }}>{status}</span>
}

function BroadcastTab({ token }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/portal/broadcasts', { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json(); setList(d.broadcasts || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShow(true)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>+ Create broadcast</button>
      </div>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No broadcasts yet. Create your first one.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Name</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Segment</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>When</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Sent</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => (
                <tr key={b.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0a0a0a' }}>{b.name}</td>
                  <td style={{ padding: '14px 18px', color: '#555' }}>{b.email_segments?.name || SEGMENT_LABEL[b.segment] || b.segment}</td>
                  <td style={{ padding: '14px 18px' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding: '14px 18px', color: '#555' }}>{b.status === 'sent' ? fmtWhen(b.sent_at) : b.schedule_type === 'event' ? 'On event' : fmtWhen(b.scheduled_at)}</td>
                  <td style={{ padding: '14px 18px', color: '#555' }}>{b.status === 'sent' ? b.sent_count : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {show && <CreateBroadcastModal token={token} onClose={() => setShow(false)} onCreated={load} />}
    </div>
  )
}

function ReportedTab({ token }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/comments', { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json(); setComments(d.comments || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function moderate(id, type, action) {
    setBusy(id)
    try {
      await fetch('/api/admin/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ id, type, action }),
      })
      setComments(cs => cs.filter(c => c.id !== id))
    } catch {} finally { setBusy(null) }
  }

  const KIND_LABEL = { comment: 'Comment', forum_thread: 'Forum thread', forum_reply: 'Forum reply', book_prompt: 'Book prompt', book_reply: 'Book response', member_post: 'Member post' }

  if (loading) return <p style={{ fontFamily: ff, fontSize: 13.5, color: '#888' }}>Loading…</p>
  if (comments.length === 0) return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', padding: '40px 30px', textAlign: 'center', color: '#888' }}>
      <div style={{ fontFamily: ffH, fontSize: 17, color: '#0a0a0a', marginBottom: 8 }}>Nothing flagged</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>Reported comments will appear here for review. Forum posts join this queue once the native Reading Room is live.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {comments.map(c => (
        <div key={`${c.type}-${c.id}`} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <div style={{ fontFamily: ff, fontSize: 13, color: '#888' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a4ad4', background: 'rgba(200,160,242,0.14)', borderRadius: 20, padding: '2px 8px', marginRight: 8 }}>{KIND_LABEL[c.type] || 'Item'}</span>
              <strong style={{ color: '#0a0a0a' }}>{c.author_name}</strong>
              {c.context && <> · {c.href ? <a href={c.href} target="_blank" style={{ color: '#c4364a', textDecoration: 'none' }}>{c.context}</a> : c.context}</>}
            </div>
            <span style={{ fontFamily: ff, fontSize: 12, color: '#c4364a', background: '#fbeaee', borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap' }}>
              {c.report_count} report{c.report_count === 1 ? '' : 's'}
            </span>
          </div>
          <p style={{ fontFamily: ff, fontSize: 14.5, lineHeight: 1.55, color: '#333', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{c.body}</p>
          {c.reasons?.length > 0 && (
            <div style={{ fontFamily: ff, fontSize: 12.5, color: '#999', marginBottom: 12 }}>
              Reasons: {c.reasons.map((r, i) => <span key={i}>“{r}”{i < c.reasons.length - 1 ? ', ' : ''}</span>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => moderate(c.id, c.type, 'keep')} disabled={busy === c.id}
              style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 16px', fontFamily: ff, fontSize: 13, cursor: 'pointer', color: '#333' }}>Keep</button>
            <button onClick={() => moderate(c.id, c.type, 'remove')} disabled={busy === c.id}
              style={{ background: '#c4364a', border: 'none', borderRadius: 6, padding: '7px 16px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Forums (private, invite-gated rooms tied to a segment) ──
function CreateForumModal({ token, segments, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [guidelines, setGuidelines] = useState('')
  const [tiedType, setTiedType] = useState('segment')
  const [tiedRef, setTiedRef] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit() {
    if (!name.trim()) { setMsg('Name is required.'); return }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/forums', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ name, description, guidelines, tied_to_type: tiedType, tied_to_ref: tiedRef, segment_id: segmentId || null }),
      })
      const d = await res.json()
      if (res.ok) { onCreated(); onClose() } else setMsg(d.error || 'Couldn’t create.')
    } finally { setBusy(false) }
  }

  const input = { width: '100%', padding: '11px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '16px 0 8px' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 640, maxWidth: '96vw', padding: 28, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: ffH, fontSize: 22, fontWeight: 700 }}>Create forum</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>A private room. Its members are snapshotted from the segment you pick (you can adjust later).</p>

        <div style={label}>Forum name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Democracy Salons" style={input} />

        <div style={label}>Description</div>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="One line about this room" style={input} />

        <div style={label}>Audience (segment)</div>
        <select value={segmentId} onChange={e => setSegmentId(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
          <option value="">No segment — just me (add members later)</option>
          {segments.map(s => <option key={s.id} value={s.id}>{s.name}{typeof s.member_count === 'number' ? ` (${s.member_count})` : ''}</option>)}
        </select>
        {segments.length === 0 && <p style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Create a segment under Emails → Segments first to invite a cohort.</p>}

        <div style={label}>Tied to</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={tiedType} onChange={e => setTiedType(e.target.value)} style={{ ...input, width: 160, cursor: 'pointer' }}>
            <option value="segment">Segment</option>
            <option value="event">Event</option>
            <option value="article">Article</option>
            <option value="standalone">Standalone</option>
          </select>
          {(tiedType === 'event' || tiedType === 'article') && (
            <input value={tiedRef} onChange={e => setTiedRef(e.target.value)} placeholder={tiedType === 'article' ? 'Article slug' : 'Event reference'} style={input} />
          )}
        </div>

        <div style={label}>Room guidelines</div>
        <textarea value={guidelines} onChange={e => setGuidelines(e.target.value)} rows={4} placeholder="Ground rules shown at the top of the room…" style={{ ...input, resize: 'vertical' }} />

        {msg && <p style={{ fontSize: 13, color: '#c04040', marginTop: 12 }}>{msg}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 18px', fontFamily: ff, fontSize: 13, cursor: 'pointer', color: '#555' }}>Cancel</button>
          <button onClick={submit} disabled={busy || !name.trim()} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{busy ? 'Creating…' : 'Create forum'}</button>
        </div>
      </div>
    </div>
  )
}

function ForumsTab({ token }) {
  const [forums, setForums] = useState([])
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [fr, sg] = await Promise.all([
        fetch('/api/admin/forums', { headers: { Authorization: `Bearer ${await token()}` } }).then(r => r.json()),
        fetch('/api/admin/segments', { headers: { Authorization: `Bearer ${await token()}` } }).then(r => r.json()),
      ])
      setForums(fr.forums || []); setSegments(sg.custom || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function toggleStatus(f) {
    const status = f.status === 'active' ? 'archived' : 'active'
    await fetch('/api/admin/forums', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: f.id, status }) })
    setForums(fs => fs.map(x => x.id === f.id ? { ...x, status } : x))
  }

  async function moderate(f, action) {
    await fetch('/api/admin/forums', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: f.id, action }) })
    setForums(fs => fs.map(x => x.id === f.id ? { ...x, status: action === 'approve' ? 'active' : 'declined' } : x))
  }

  const activeCount = forums.filter(f => f.status === 'active').length
  const pendingCount = forums.filter(f => f.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: '#888' }}>
          {activeCount} active forum{activeCount === 1 ? '' : 's'}
          {pendingCount > 0 && <strong style={{ color: '#c4364a' }}> · {pendingCount} forum proposal{pendingCount === 1 ? '' : 's'} to review</strong>}
        </div>
        <button onClick={() => setShow(true)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>+ Create forum</button>
      </div>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Loading…</div>
          : forums.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No forums yet. Create one tied to a segment.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 500 }}>Forum</th>
                  <th style={{ padding: '14px 18px', fontWeight: 500 }}>Segment</th>
                  <th style={{ padding: '14px 18px', fontWeight: 500 }}>Members</th>
                  <th style={{ padding: '14px 18px', fontWeight: 500 }}>Threads</th>
                  <th style={{ padding: '14px 18px', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 500 }}></th>
                </tr>
              </thead>
              <tbody>
                {forums.map(f => (
                  <tr key={f.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '14px 18px' }}><strong style={{ color: '#0a0a0a' }}>{f.name}</strong>{f.description && <div style={{ color: '#aaa', fontSize: 12 }}>{f.description}</div>}</td>
                    <td style={{ padding: '14px 18px', color: '#555' }}>{f.segment_name || '—'}</td>
                    <td style={{ padding: '14px 18px', color: '#555' }}>{f.member_count || 0}</td>
                    <td style={{ padding: '14px 18px', color: '#555' }}>{f.thread_count || 0}</td>
                    <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 11.5, color: f.status === 'active' ? '#2d8f5a' : f.status === 'pending' ? '#c4364a' : '#999', textTransform: 'capitalize' }}>{f.status === 'pending' ? 'Proposed' : f.status}</span></td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {f.status === 'pending' ? (
                        <>
                          <button onClick={() => moderate(f, 'decline')} style={{ background: 'none', border: '1px solid rgba(224,112,112,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: ff, color: '#c04040', marginRight: 6 }}>Decline</button>
                          <button onClick={() => moderate(f, 'approve')} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>Approve</button>
                        </>
                      ) : (
                        <>
                          {f.status === 'active' && <a href={`/portal/forums/${f.id}`} target="_blank" style={{ display: 'inline-block', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, fontFamily: ff, color: '#333', textDecoration: 'none', marginRight: 6 }}>Open ↗</a>}
                          <button onClick={() => toggleStatus(f)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: ff, color: '#333' }}>{f.status === 'active' ? 'Archive' : 'Reactivate'}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {show && <CreateForumModal token={token} segments={segments} onClose={() => setShow(false)} onCreated={load} />}
    </div>
  )
}

export default function PortalManagementSection({ supabase }) {
  const token = useToken(supabase)
  const [tab, setTab] = useState('messages')
  const TABS = [['reported', 'Reported'], ['messages', 'Private messages'], ['forums', 'Forums'], ['broadcasts', 'Inbox broadcasts']]
  return (
    <div style={{ fontFamily: ff }}>
      <h1 style={{ fontFamily: ffH, fontSize: 30, fontWeight: 700, marginBottom: 4 }}>Portal Management</h1>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 22 }}>Member messages, moderation, and broadcasts.</p>
      <div style={{ display: 'flex', gap: 26, borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === v ? '#c4364a' : 'transparent'}`, color: tab === v ? '#c4364a' : '#666', padding: '8px 0', fontSize: 14, cursor: 'pointer', fontFamily: ff, marginBottom: -1 }}>{l}</button>
        ))}
      </div>
      {tab === 'reported' && <ReportedTab token={token} />}
      {tab === 'messages' && <MessagesTab token={token} />}
      {tab === 'forums' && <ForumsTab token={token} />}
      {tab === 'broadcasts' && <BroadcastTab token={token} />}
    </div>
  )
}
