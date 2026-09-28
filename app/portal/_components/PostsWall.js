'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '../../../lib/supabase'
import { prepareImageUpload, isDuplicateUpload } from '../../../lib/uploadImage'
import { toEmbedUrl } from '../../../lib/videoEmbed'
import { usePortal } from './PortalShell'

function VideoEmbed({ src }) {
  if (!src) return null
  return (
    <div style={{ marginTop: 10, position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden', background: '#000' }}>
      <iframe src={src} title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} />
    </div>
  )
}

const SERIF = "'thermal-variable', Georgia, serif"
const URL_RE = /(https?:\/\/[^\s]+)/i

function timeAgo(iso) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ name, src, size = 40 }) {
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: size * 0.42, color: '#000' }}>{(name || 'M')[0].toUpperCase()}</div>
}

function LinkCard({ link }) {
  if (!link) return null
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 10, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', textDecoration: 'none' }}>
      {link.image && <img src={link.image} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontFamily: SERIF, fontSize: 14, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{link.title || link.url}</div>
        {link.description && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{link.description}</div>}
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{(() => { try { return new URL(link.url).hostname.replace(/^www\./, '') } catch { return link.url } })()}</div>
      </div>
    </a>
  )
}

export default function PostsWall({ memberId, currentUserId }) {
  const supabase = useMemo(() => createClient(), [])
  const ctx = usePortal()
  const me = ctx?.member || {}
  const canPost = memberId === currentUserId
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [text, setText] = useState('')
  const [image, setImage] = useState('')
  const [videoInput, setVideoInput] = useState('')
  const [showVideo, setShowVideo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const videoEmbed = toEmbedUrl(videoInput)
  const fileRef = useRef(null)
  const dedupeRef = useRef(null)

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/posts?member_id=${memberId}`, { headers: await auth() })
      const d = await res.json(); setPosts(d.posts || [])
    } catch {} finally { setLoading(false) }
  }, [memberId, auth])
  useEffect(() => { load() }, [load])

  async function uploadImage(file) {
    if (!file || !file.type.startsWith('image/')) return
    if (isDuplicateUpload(dedupeRef, file)) return
    setUploading(true)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim: 1400 })
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path); setImage(publicUrl) }
    } finally { setUploading(false) }
  }

  function resetComposer() { setText(''); setImage(''); setVideoInput(''); setShowVideo(false); setComposing(false) }

  async function submit() {
    if (busy || (!text.trim() && !image && !videoEmbed)) return
    setBusy(true)
    // Don't double up a link card when a video is attached.
    const link = !videoInput && (text.match(URL_RE)?.[1] || null)
    try {
      const res = await fetch('/api/portal/posts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ body: text.trim(), image_url: image || null, video_url: videoInput || null, link_url: link }) })
      if (res.ok) { const d = await res.json(); setPosts(p => [d.post, ...p]); resetComposer() }
    } finally { setBusy(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this post?')) return
    const res = await fetch('/api/portal/posts', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ id }) })
    if (res.ok) setPosts(p => p.filter(x => x.id !== id))
  }
  async function report(id) {
    if (!confirm('Report this post to moderators?')) return
    await fetch('/api/portal/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify({ id, action: 'report' }) })
    alert('Thanks — a moderator will take a look.')
  }

  const linkBtn = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SERIF, fontSize: 12.5, color: 'var(--muted)' }

  return (
    <div style={{ marginTop: 22 }}>
      {canPost && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: 16, marginBottom: 18 }}>
          {!composing ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={me.full_name} src={me.avatar_url} size={44} />
                <button onClick={() => setComposing(true)} style={{ flex: 1, textAlign: 'left', background: 'none', border: '1px solid var(--border)', borderRadius: 24, padding: '13px 18px', fontFamily: SERIF, fontSize: 15, color: 'var(--muted)', cursor: 'pointer' }}>Start a post</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button onClick={() => { setComposing(true); setTimeout(() => fileRef.current?.click(), 0) }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', fontFamily: SERIF, fontSize: 13.5, color: '#4a6fd4', cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="5.5" cy="6.5" r="1" fill="currentColor"/><path d="M3 11l3-3 2.5 2.5L11 7l2 2" stroke="currentColor" strokeWidth="1.4"/></svg>
                  Photo
                </button>
                <button onClick={() => { setComposing(true); setShowVideo(true) }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', fontFamily: SERIF, fontSize: 13.5, color: '#2d8f5a', cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 7l3-1.5v5L11 9" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  Video
                </button>
                <a href="/portal/write" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'none', borderRadius: 8, padding: '8px 10px', fontFamily: SERIF, fontSize: 13.5, color: '#c47000', textDecoration: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8h6M5 11h6M5 5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  Write article
                </a>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <Avatar name={me.full_name} src={me.avatar_url} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{me.full_name || 'You'}</div>
                  <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="What are you thinking? Share with The Parlor…"
                    style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', fontFamily: SERIF, fontSize: 16, background: 'transparent', color: 'var(--ink)', boxSizing: 'border-box', marginTop: 4 }} />
                </div>
              </div>
              {image && (
                <div style={{ position: 'relative', marginTop: 8, display: 'inline-block' }}>
                  <img src={image} alt="" style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8, display: 'block' }} />
                  <button onClick={() => setImage('')} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}>×</button>
                </div>
              )}
              {showVideo && (
                <div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--cream)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={videoInput} onChange={e => setVideoInput(e.target.value)} placeholder="Paste a YouTube or Vimeo link…"
                      style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: SERIF, fontSize: 14, outline: 'none' }} />
                    <button onClick={() => { setShowVideo(false); setVideoInput('') }} style={{ ...linkBtn }}>Remove</button>
                  </div>
                  {videoInput && !videoEmbed && <div style={{ fontSize: 12, color: '#c04040', marginTop: 6 }}>Only YouTube and Vimeo links can be embedded.</div>}
                  {videoEmbed && <VideoEmbed src={videoEmbed} />}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...linkBtn, display: 'flex', alignItems: 'center', gap: 6, color: '#4a6fd4', fontSize: 13.5 }}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="5.5" cy="6.5" r="1" fill="currentColor"/><path d="M3 11l3-3 2.5 2.5L11 7l2 2" stroke="currentColor" strokeWidth="1.4"/></svg>
                    {uploading ? 'Uploading…' : 'Photo'}
                  </button>
                  <button onClick={() => setShowVideo(v => !v)} style={{ ...linkBtn, display: 'flex', alignItems: 'center', gap: 6, color: '#2d8f5a', fontSize: 13.5 }}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 7l3-1.5v5L11 9" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                    Video
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={resetComposer} style={linkBtn}>Cancel</button>
                  <button onClick={submit} disabled={busy || uploading || (!text.trim() && !image && !videoEmbed)} style={{ background: (text.trim() || image || videoEmbed) ? '#0a0a0a' : '#ccc', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 22px', fontFamily: SERIF, fontSize: 14, fontWeight: 500, cursor: (text.trim() || image || videoEmbed) ? 'pointer' : 'default' }}>{busy ? 'Posting…' : 'Post'}</button>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>Paste a link for a preview card, or a YouTube/Vimeo link via Video.</div>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }} />
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--cream)', padding: 28, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>
          {canPost ? 'No posts yet — share something with the community.' : 'No posts yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(p => (
            <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Avatar name={p.author_name} src={p.author_avatar} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div>
                      <span style={{ fontFamily: SERIF, fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{p.author_name}</span>
                      {p.author_headline && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}> · {p.author_headline}</span>}
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{timeAgo(p.created_at)}</div>
                    </div>
                    {p.member_id === currentUserId
                      ? <button style={linkBtn} onClick={() => remove(p.id)}>Delete</button>
                      : <button style={linkBtn} onClick={() => report(p.id)}>Report</button>}
                  </div>
                  {p.body && <div style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.6, color: '#222', marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.body}</div>}
                  {p.image_url && <img src={p.image_url} alt="" style={{ marginTop: 10, maxWidth: '100%', borderRadius: 10, display: 'block' }} />}
                  {p.video_url && <VideoEmbed src={p.video_url} />}
                  <LinkCard link={p.link} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
