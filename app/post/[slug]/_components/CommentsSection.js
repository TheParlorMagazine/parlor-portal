'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '../../../../lib/supabase'

const SERIF = "'Source Serif 4', Georgia, serif"
const DISPLAY = "'Playfair Display', Georgia, serif"
const ACCENT = '#c4364a'

function timeAgo(iso) {
  const d = new Date(iso)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ name, src, size = 34 }) {
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, background: '#f2b8c6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: DISPLAY, fontSize: size * 0.42, fontWeight: 600, color: ACCENT,
    }}>{(name || 'M')[0].toUpperCase()}</div>
  )
}

export default function CommentsSection({ articleId, articleSlug, userId }) {
  const supabase = useMemo(() => createClient(), [])
  const [comments, setComments] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [replyTo, setReplyTo] = useState(null)      // comment id being replied to
  const [replyText, setReplyText] = useState('')
  const [editing, setEditing] = useState(null)      // comment id being edited
  const [editText, setEditText] = useState('')

  const canPost = !!userId

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?article_id=${articleId}`)
      const data = await res.json()
      setComments(data.comments || [])
      setCount(data.count || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [articleId])

  useEffect(() => { load() }, [load])

  async function post(body, parentId) {
    const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
    const res = await fetch('/api/comments', {
      method: 'POST', headers,
      body: JSON.stringify({ article_id: articleId, body, parent_id: parentId || undefined }),
    })
    return res.ok
  }

  async function submitTop(e) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    if (await post(text.trim())) { setText(''); await load() }
    setBusy(false)
  }

  async function submitReply(parentId) {
    if (!replyText.trim() || busy) return
    setBusy(true)
    if (await post(replyText.trim(), parentId)) { setReplyText(''); setReplyTo(null); await load() }
    setBusy(false)
  }

  async function saveEdit(id) {
    if (!editText.trim() || busy) return
    setBusy(true)
    const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
    const res = await fetch('/api/comments', { method: 'PATCH', headers, body: JSON.stringify({ id, body: editText.trim() }) })
    if (res.ok) { setEditing(null); await load() }
    setBusy(false)
  }

  async function remove(id) {
    if (!confirm('Delete this comment?')) return
    const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
    const res = await fetch('/api/comments', { method: 'DELETE', headers, body: JSON.stringify({ id }) })
    if (res.ok) await load()
  }

  async function report(id) {
    const reason = prompt('Report this comment — why? (optional)')
    if (reason === null) return
    const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
    const res = await fetch('/api/comments/report', { method: 'POST', headers, body: JSON.stringify({ comment_id: id, reason }) })
    if (res.ok) alert('Thanks — a moderator will take a look.')
    else if (res.status === 401) alert('Sign in to report a comment.')
  }

  const linkBtn = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SERIF, fontSize: 13, color: '#999' }

  function CommentRow({ c, isReply }) {
    const mine = c.member_id === userId
    return (
      <div style={{ display: 'flex', gap: 12, marginTop: isReply ? 16 : 24 }}>
        <Avatar name={c.author_name} src={c.author_avatar} size={isReply ? 30 : 36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{c.author_name}</span>
            <span style={{ fontFamily: SERIF, fontSize: 12, color: '#aaa' }}>{timeAgo(c.created_at)}{c.edited_at ? ' · edited' : ''}</span>
          </div>

          {editing === c.id ? (
            <div style={{ marginTop: 8 }}>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                style={{ width: '100%', padding: 10, border: '1px solid #e8d4d8', borderRadius: 6, fontFamily: SERIF, fontSize: 15, resize: 'vertical', outline: 'none' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={() => saveEdit(c.id)} disabled={busy} style={{ ...linkBtn, color: ACCENT, fontWeight: 600 }}>Save</button>
                <button onClick={() => setEditing(null)} style={linkBtn}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: SERIF, fontSize: 15.5, lineHeight: 1.6, color: '#333', margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</p>
          )}

          {editing !== c.id && (
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              {canPost && !isReply && <button style={linkBtn} onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText('') }}>Reply</button>}
              {mine && <button style={linkBtn} onClick={() => { setEditing(c.id); setEditText(c.body) }}>Edit</button>}
              {mine && <button style={linkBtn} onClick={() => remove(c.id)}>Delete</button>}
              {!mine && canPost && <button style={linkBtn} onClick={() => report(c.id)}>Report</button>}
            </div>
          )}

          {replyTo === c.id && (
            <div style={{ marginTop: 10 }}>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} autoFocus placeholder={`Reply to ${c.author_name}…`}
                style={{ width: '100%', padding: 10, border: '1px solid #e8d4d8', borderRadius: 6, fontFamily: SERIF, fontSize: 15, resize: 'vertical', outline: 'none' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={() => submitReply(c.id)} disabled={busy || !replyText.trim()} style={{ ...linkBtn, color: ACCENT, fontWeight: 600 }}>Post reply</button>
                <button onClick={() => setReplyTo(null)} style={linkBtn}>Cancel</button>
              </div>
            </div>
          )}

          {(c.replies || []).map(r => <CommentRow key={r.id} c={r} isReply />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 24px 40px' }}>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
        Conversation{count > 0 ? ` · ${count}` : ''}
      </h2>
      <p style={{ fontFamily: SERIF, fontSize: 13, color: '#999', margin: '0 0 24px' }}>
        A space for Parlor members. Be generous, be real.
      </p>

      {canPost ? (
        <form onSubmit={submitTop} style={{ marginBottom: 8 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Share your thoughts…"
            style={{ width: '100%', padding: 12, border: '1px solid #e8d4d8', borderRadius: 8, fontFamily: SERIF, fontSize: 15.5, resize: 'vertical', outline: 'none', background: '#fff' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" disabled={busy || !text.trim()} style={{
              padding: '10px 22px', background: text.trim() ? '#1a1a1a' : '#ccc', color: '#fff', border: 'none',
              borderRadius: 6, fontFamily: SERIF, fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default',
            }}>{busy ? 'Posting…' : 'Post comment'}</button>
          </div>
        </form>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #f9eff2, #fce8ec)', border: '1px solid #f2d8df', borderRadius: 10, padding: '22px 24px', marginBottom: 8, textAlign: 'center' }}>
          <p style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Join the conversation</p>
          <p style={{ fontFamily: SERIF, fontSize: 14, color: '#666', margin: '0 0 16px' }}>Comments are open to Parlor members. It’s free to join.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/signup?returnTo=${encodeURIComponent(`/post/${articleSlug}`)}`} style={{ padding: '10px 22px', background: '#1a1a1a', color: '#fff', borderRadius: 6, fontFamily: SERIF, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Subscribe free</a>
            <a href={`/login?returnTo=${encodeURIComponent(`/post/${articleSlug}`)}`} style={{ padding: '10px 22px', background: '#fff', color: '#1a1a1a', border: '1px solid #e8d4d8', borderRadius: 6, fontFamily: SERIF, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
          </div>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        {loading ? (
          <p style={{ fontFamily: SERIF, fontSize: 14, color: '#aaa' }}>Loading…</p>
        ) : comments.length === 0 ? (
          <p style={{ fontFamily: SERIF, fontSize: 15, color: '#aaa', fontStyle: 'italic' }}>No comments yet — start the conversation.</p>
        ) : (
          comments.map(c => <CommentRow key={c.id} c={c} isReply={false} />)
        )}
      </div>
    </div>
  )
}
