'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '../../lib/supabase'
import PortalShell, { usePortal, ROLE_LABELS } from './_components/PortalShell'
import PostGuidelines, { FORUM_GUIDELINES } from './_components/PostGuidelines'

const SERIF = "'thermal-variable', Georgia, serif"

function ProposeModal({ getToken, onClose, onDone }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [policy, setPolicy] = useState('request')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function submit() {
    if (!name.trim()) { setMsg('Give your forum a name.'); return }
    if (!agreed) { setMsg('Please agree to the community guidelines.'); return }
    setBusy(true); setMsg('')
    const headers = await getToken()
    const res = await fetch('/api/portal/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ name, description: desc, join_policy: policy }) })
    setBusy(false)
    if (res.ok) onDone(); else { const d = await res.json(); setMsg(d.error || 'Could not submit') }
  }
  const inp = { width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: SERIF, fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '14px 0 6px' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 480, maxWidth: '94vw', padding: 26, fontFamily: SERIF }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Propose a forum</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 14px' }}>A Master Admin reviews new forums. Once approved, you're the moderator and can invite members.</p>
        <PostGuidelines heading="Before you create a forum…" items={FORUM_GUIDELINES} note="You're responsible for the space you create. Forums that don't follow these guidelines may be removed." agreeLabel="I'll moderate this forum and follow The Parlor's community guidelines." agreed={agreed} onAgree={setAgreed} />
        <div style={lbl}>Forum name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Climate Writers Circle" style={inp} />
        <div style={lbl}>What's it about?</div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="A sentence or two" style={{ ...inp, resize: 'vertical' }} />
        <div style={lbl}>Who can join?</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['open', 'Public — anyone joins'], ['request', 'Private — you approve requests']].map(([v, l]) => (
            <button key={v} onClick={() => setPolicy(v)} style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: `1px solid ${policy === v ? '#0a0a0a' : 'var(--border)'}`, background: policy === v ? '#0a0a0a' : '#fff', color: policy === v ? '#fff' : 'var(--ink)', fontFamily: SERIF, fontSize: 13, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        {msg && <p style={{ color: '#c04040', fontSize: 13, marginTop: 10 }}>{msg}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 18px', fontFamily: SERIF, fontSize: 13, cursor: 'pointer', color: '#555' }}>Cancel</button>
          <button onClick={submit} disabled={busy || !agreed} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: SERIF, fontSize: 13, fontWeight: 600, cursor: (busy || !agreed) ? 'default' : 'pointer', opacity: agreed ? 1 : 0.6 }}>{busy ? 'Sending…' : 'Submit proposal'}</button>
        </div>
      </div>
    </div>
  )
}

function monthYear(s) {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function newestDate(s) {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(s) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return 'just now'
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Hub() {
  const ctx = usePortal()
  const supabase = createClient()
  const [lib, setLib] = useState({ state: 'loading', items: [] })
  const [feed, setFeed] = useState({ state: 'loading', items: [] })
  const [events, setEvents] = useState({ state: 'loading', items: [] })
  const [book, setBook] = useState(null)
  const [forums, setForums] = useState([])
  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposedDone, setProposedDone] = useState(false)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const auth = { Authorization: `Bearer ${session.access_token}` }
      try {
        const res = await fetch('/api/member-library', { headers: auth })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setLib({ state: 'ready', items: data.items || [] })
      } catch { if (!cancelled) setLib({ state: 'error', items: [] }) }
      try {
        const res = await fetch('/api/portal/feed', { headers: auth })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setFeed({ state: 'ready', items: data.items || [] })
      } catch { if (!cancelled) setFeed({ state: 'error', items: [] }) }
      try {
        const res = await fetch('/api/portal/events', { headers: auth })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setEvents({ state: 'ready', items: (data.upcoming || []).slice(0, 3) })
      } catch { if (!cancelled) setEvents({ state: 'error', items: [] }) }
      try {
        const res = await fetch('/api/portal/book-club', { headers: auth })
        if (!res.ok) throw new Error()
        const data = await res.json()
        const current = (data.books || []).find(b => b.status === 'current') || (data.books || [])[0] || null
        if (!cancelled) setBook(current)
      } catch { if (!cancelled) setBook(null) }
      try {
        const res = await fetch('/api/portal/forums', { headers: auth })
        if (res.ok) { const data = await res.json(); if (!cancelled) setForums(data.forums || []) }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  const member = ctx?.member
  const user = ctx?.user
  const name =
    member?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name ||
    user?.email?.split('@')[0] || 'there'
  const first = name.split(' ')[0]
  const since = monthYear(member?.created_at)
  const roleLabel = ROLE_LABELS[member?.role]
  const subline = roleLabel
    ? `${roleLabel}${since ? ` since ${since}` : ''}`
    : member?.plan
      ? `${member.plan} member${since ? ` since ${since}` : ''}`
      : (since ? `Member since ${since}` : 'Welcome to The Parlor')

  const toggleLike = useCallback(async (commentId) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/portal/comments/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ comment_id: commentId }),
    })
    if (!res.ok) return
    const { liked, like_count } = await res.json()
    setFeed(prev => ({
      ...prev,
      items: prev.items.map(it => it.kind !== 'article_comments' ? it : {
        ...it,
        comments: it.comments.map(c => c.id === commentId ? { ...c, liked_by_me: liked, like_count } : c),
      }),
    }))
  }, [supabase])

  const nextEvent = events.items[0] || null
  const libCount = !book ? 4 : 3
  const newest = lib.items.slice(0, libCount)

  return (
    <>
      <style>{`
        .hub-greeting { font-family:'thermal-variable', Georgia, serif; font-size:28px; font-weight:500; margin:0 0 4px; }
        .hub-greeting em { color:var(--pink); font-style:italic; }
        .hub-sub { font-size:13px; color:var(--muted); margin:0 0 24px; }

        .hub-sec-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .hub-sec-title { font-family:'thermal-variable', Georgia, serif; font-size:16px; font-style:italic; color:var(--muted); font-weight:400; }
        .hub-sec-link { font-size:12px; color:#000; text-decoration:underline; text-underline-offset:3px; }

        .hub-lib-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .hub-lib-grid.cols-4 { grid-template-columns:repeat(4,1fr); }
        .hub-lib-item { display:block; }
        .hub-lib-thumb { width:100%; aspect-ratio:3/2; border-radius:8px; overflow:hidden; background:#f2ece4; margin-bottom:8px; }
        .hub-lib-thumb img { width:100%; height:100%; object-fit:cover; display:block; transform:scale(1.15); transform-origin:center; transition:transform 0.3s ease; }
        .hub-lib-title { font-family:'thermal-variable', Georgia, serif; font-size:13.5px; font-weight:500; line-height:1.3; color:var(--ink); margin-bottom:3px; }
        a.hub-lib-item:hover .hub-lib-title { text-decoration:underline; text-underline-offset:2px; }
        .hub-lib-meta { font-size:11.5px; color:var(--muted); }

        /* Top row: library (left) + book club pick (right) */
        .hub-top { display:grid; grid-template-columns:1fr 340px; gap:24px; align-items:stretch; }
        .hub-top.no-aside { grid-template-columns:1fr; }
        .hub-label { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--pink); font-weight:600; margin-bottom:6px; }
        .hub-cta { font-size:12px; color:#000; margin-top:8px; }
        .hub-empty { color:var(--muted); font-size:13px; line-height:1.5; }

        .hub-book { display:flex; flex-direction:row; gap:16px; align-items:flex-start; border:1px solid var(--border); border-radius:12px; padding:17px; background:#fff; transition:border-color 0.15s; height:100%; }
        a.hub-book:hover { border-color:var(--pinkborder); }
        .hub-book-cover { width:118px; height:177px; border-radius:6px; object-fit:cover; background:#f2ece4; box-shadow:0 4px 14px rgba(0,0,0,0.13); flex-shrink:0; }
        .hub-book-cover-ph { display:flex; align-items:center; justify-content:center; font-size:11px; color:#c9b8bd; text-align:center; padding:8px; }
        .hub-book-body { min-width:0; }
        .hub-book-title { font-family:'thermal-variable',Georgia,serif; font-size:17px; font-weight:500; color:var(--ink); line-height:1.22; margin-bottom:3px; }
        .hub-book-author { font-size:12.5px; color:var(--muted); }

        /* Full-width event feature */
        .hub-event { display:flex; gap:20px; border:1px solid var(--border); border-radius:12px; padding:18px; background:#fff; align-items:center; transition:border-color 0.15s; }
        a.hub-event:hover { border-color:var(--pinkborder); }
        .hub-event-cover { width:220px; height:132px; border-radius:9px; object-fit:cover; background:#f2ece4; flex-shrink:0; }
        .hub-event-date { width:132px; height:132px; border-radius:11px; background:var(--goldlight); display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; }
        .hub-event-date .m { font-size:12px; text-transform:uppercase; letter-spacing:.12em; color:#b26a00; font-weight:600; }
        .hub-event-date .d { font-family:'thermal-variable',Georgia,serif; font-size:44px; font-weight:600; line-height:1; margin-top:2px; }
        .hub-event-body { min-width:0; flex:1; }
        .hub-event-title { font-family:'thermal-variable',Georgia,serif; font-size:20px; font-weight:500; color:var(--ink); line-height:1.2; margin-bottom:4px; }
        .hub-event-meta { font-size:13px; color:var(--muted); line-height:1.5; }

        @media (max-width:820px){ .hub-top{ grid-template-columns:1fr; } .hub-event-cover{ width:120px; height:90px; } }

        .hub-divider { height:1px; background:var(--border); margin:28px 0; }
        .hub-stub { background:var(--cream); border:1px solid var(--border); border-radius:11px; padding:22px 24px; color:var(--muted); font-size:13.5px; line-height:1.65; }
        .hub-stub strong { color:var(--ink); }

        .hub-feed-wrap { display:grid; grid-template-columns:1fr 280px; gap:28px; align-items:start; }
        @media (max-width:1280px){
          .hub-feed-wrap{ grid-template-columns:1fr; }
          .hub-forums-sidebar{ position:static; width:100%; order:-1; }
          .hub-fsb-card{ display:flex; flex-direction:column; gap:8px; }
          .hub-fsb-forum{ display:grid !important; grid-template-columns:72px 1fr; grid-template-rows:1fr; align-items:stretch; gap:0; border-radius:10px; overflow:hidden; }
          .hub-fsb-thumb{ width:72px !important; height:72px !important; border-radius:0 !important; flex-shrink:0; object-fit:cover; grid-row:1; grid-column:1; object-position:center center !important; transform:none !important; }
          .hub-fsb-thumb-ph{ width:72px !important; height:72px !important; border-radius:0 !important; flex-shrink:0; grid-row:1; grid-column:1; }
          .hub-fsb-body{ grid-row:1; grid-column:2; padding:10px 14px !important; display:flex; flex-direction:column; justify-content:center; min-width:0; }
          .hub-fsb-name{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        }
        .hub-forums-sidebar { position:sticky; top:24px; }
        .hub-fsb-title { font-family:'thermal-variable',Georgia,serif; font-size:15px; font-style:italic; color:var(--muted); font-weight:400; margin-bottom:12px; }
        .hub-fsb-card { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
        .hub-fsb-forum { border:1px solid var(--border); border-radius:10px; background:#fff; overflow:hidden; text-decoration:none; display:block; transition:border-color 0.15s; }
        .hub-fsb-forum:hover { border-color:var(--pinkborder); }
        .hub-fsb-thumb { width:100%; height:80px; object-fit:cover; display:block; background:var(--cream); object-position:right 70%; transform:scale(1.45); transform-origin:right 70%; }
        .hub-fsb-thumb-ph { width:100%; height:80px; background:linear-gradient(135deg,var(--cream),var(--pink)); }
        .hub-fsb-body { padding:13px 11px 10px; }
        .hub-fsb-name { font-size:13px; font-weight:600; color:var(--ink); line-height:1.25; margin-bottom:4px; }
        .hub-fsb-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .hub-fsb-meta { font-size:11px; color:var(--muted); }
        .hub-fsb-new { font-size:10.5px; font-weight:600; color:#fff; background:var(--pink); border-radius:20px; padding:1px 7px; }
        .hub-fsb-join { font-size:11px; font-weight:600; color:var(--pink); border:1px solid var(--pinkborder); border-radius:20px; padding:2px 9px; white-space:nowrap; }
        .hub-fsb-joined { font-size:11px; color:var(--muted); }
        .hub-fsb-propose { display:block; width:100%; padding:10px 0; text-align:center; border:1px solid var(--border); border-radius:10px; font-size:13px; font-weight:600; color:var(--ink); text-decoration:none; background:#fff; cursor:pointer; font-family:inherit; transition:border-color 0.15s, background 0.15s; }
        .hub-fsb-propose:hover { border-color:var(--pinkborder); background:rgba(242,184,198,0.06); }

        .hub-feed { display:flex; flex-direction:column; gap:20px; }

        /* Article comment card */
        .hfc { border:1px solid var(--border); border-radius:14px; overflow:hidden; background:#fff; }
        .hfc-img { width:100%; aspect-ratio:16/7; object-fit:cover; display:block; }
        .hfc-img-ph { width:100%; aspect-ratio:16/7; background:var(--cream); }
        .hfc-info { padding:14px 16px 12px; }
        .hfc-title { font-family:'thermal-variable',Georgia,serif; font-size:19px; font-weight:500; color:var(--ink); line-height:1.25; text-decoration:none; display:block; margin-bottom:6px; }
        .hfc-title:hover { text-decoration:underline; text-underline-offset:3px; }
        .hfc-meta-row { display:flex; align-items:center; gap:8px; }
        .hfc-theme { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:600; color:#c4364a; background:#fbeaee; padding:4px 12px; border-radius:20px; letter-spacing:0.02em; text-decoration:none; }
        .hfc-theme:hover { background:#f5d5db; }
        .hfc-date { font-size:11.5px; color:var(--muted); }
        .hfc-img-wrap { border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .hfc-author { display:flex; align-items:center; gap:8px; margin-top:10px; }
        .hfc-author-photo { width:26px; height:26px; border-radius:50%; object-fit:cover; background:var(--cream); flex-shrink:0; }
        .hfc-author-photo-ph { width:26px; height:26px; border-radius:50%; background:var(--pink); flex-shrink:0; }
        .hfc-author-name { font-size:12.5px; color:var(--muted); }
        .hfc-comments { padding:4px 0; }
        .hfc-comment { display:flex; gap:10px; padding:11px 16px; border-bottom:1px solid var(--border); }
        .hfc-comment:last-child { border-bottom:none; }
        .hfc-av { width:32px; height:32px; border-radius:50%; background:var(--pink); display:flex; align-items:center; justify-content:center; font-family:'thermal-variable',Georgia,serif; font-size:13px; color:#000; flex-shrink:0; overflow:hidden; }
        .hfc-av img { width:100%; height:100%; object-fit:cover; }
        .hfc-cbody { flex:1; min-width:0; }
        .hfc-cname { font-size:12.5px; font-weight:600; color:var(--ink); margin-bottom:2px; }
        .hfc-ctext { font-size:13.5px; color:#333; line-height:1.5; }
        .hfc-cmeta { display:flex; align-items:center; gap:14px; margin-top:5px; }
        .hfc-ctime { font-size:11.5px; color:var(--muted); }
        .hfc-like { display:flex; align-items:center; gap:4px; background:none; border:none; cursor:pointer; padding:0; font-size:12px; color:var(--muted); font-family:inherit; transition:color 0.15s; }
        .hfc-like:hover { color:#c4364a; }
        .hfc-like.liked { color:#c4364a; }
        .hfc-like-icon { font-size:13px; line-height:1; }
        .hfc-read-btn { display:block; margin:0 16px 16px; padding:9px 0; text-align:center; border:1px solid var(--border); border-radius:8px; font-size:13px; font-weight:600; color:var(--ink); text-decoration:none; transition:border-color 0.15s, background 0.15s; }
        .hfc-read-btn:hover { border-color:var(--pinkborder); background:rgba(242,184,198,0.06); }

        /* Other feed items */
        .hub-feed-item { display:flex; gap:13px; padding:14px 2px; border-bottom:1px solid var(--border); text-decoration:none; }
        .hub-feed-item:last-child { border-bottom:none; }
        a.hub-feed-item:hover .hub-feed-title { text-decoration:underline; text-underline-offset:2px; }
        .hub-feed-thumb { width:52px; height:52px; border-radius:8px; overflow:hidden; background:#f2ece4; flex-shrink:0; }
        .hub-feed-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .hub-feed-avatar { width:36px; height:36px; border-radius:50%; flex-shrink:0; background:var(--pink); display:flex; align-items:center; justify-content:center; font-family:'thermal-variable',Georgia,serif; font-size:15px; color:#000; }
        .hub-feed-avatar img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
        .hub-feed-body { flex:1; min-width:0; }
        .hub-feed-kind { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:var(--pink); font-weight:600; margin-bottom:2px; }
        .hub-feed-title { font-family:'thermal-variable',Georgia,serif; font-size:14.5px; font-weight:500; color:var(--ink); line-height:1.3; }
        .hub-feed-text { font-size:13px; color:#555; line-height:1.5; margin-top:2px; }
        .hub-feed-meta { font-size:11.5px; color:var(--muted); margin-top:3px; }
        .hub-feed-meta a { color:var(--muted); }

      `}</style>

      <h1 className="hub-greeting">Hello, <em>{first}.</em></h1>
      <p className="hub-sub">{subline}</p>

      {/* Top: New in the Library (left) + this month's book club pick (right) */}
      <div className={`hub-top${!book ? ' no-aside' : ''}`}>
        <div>
          <div className="hub-sec-head">
            <div className="hub-sec-title">New in the Library</div>
            <a className="hub-sec-link" href="/portal/library">see all</a>
          </div>
          {lib.state === 'ready' && newest.length > 0 ? (
            <div className={`hub-lib-grid${!book ? ' cols-4' : ''}`}>
              {newest.map(a => (
                <a className="hub-lib-item" key={a.slug} href={a.slug ? `/portal/library/${a.slug}` : '/portal/library'}>
                  <div className="hub-lib-thumb">{a.cover_image_url && <img src={a.cover_image_url} alt="" loading="lazy" style={a.slug === 'against-the-cloud' ? { objectPosition: '5% 65%' } : undefined} />}</div>
                  <div className="hub-lib-title">{a.title}</div>
                  <div className="hub-lib-meta">{a.theme || a.category}{a.date_published ? ` · ${newestDate(a.date_published)}` : ''}</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="hub-stub">{lib.state === 'loading' ? 'Loading…' : 'New pieces will appear here.'}</div>
          )}
        </div>

        {/* This month's book club pick */}
        {book ? (
          <a className="hub-book" href={`/portal/reading-room/${book.id}`}>
            {book.cover_image_url ? <img className="hub-book-cover" src={book.cover_image_url} alt="" /> : <div className="hub-book-cover hub-book-cover-ph">{book.title}</div>}
            <div className="hub-book-body">
              <div className="hub-label">This month’s read</div>
              <div className="hub-book-title">{book.title}</div>
              {book.author && <div className="hub-book-author">by {book.author}</div>}
              <div className="hub-cta">Join the discussion ›</div>
            </div>
          </a>
        ) : null}
      </div>

      {/* Full-width event feature */}
      <div style={{ marginTop: 22 }}>
        {nextEvent ? (
          <a className="hub-event" href={`/portal/events/${nextEvent.id}`}>
            {nextEvent.cover_image_url
              ? <img className="hub-event-cover" src={nextEvent.cover_image_url} alt="" />
              : (() => { const dt = nextEvent.starts_at ? new Date(nextEvent.starts_at) : null; return (
                  <div className="hub-event-date">{dt ? <><span className="m">{dt.toLocaleDateString('en-US', { month: 'short' })}</span><span className="d">{dt.getDate()}</span></> : <span className="m">TBA</span>}</div>
                ) })()}
            <div className="hub-event-body">
              <div className="hub-label">Next event{nextEvent.my_status === 'going' ? ' · ✓ Going' : ''}</div>
              <div className="hub-event-title">{nextEvent.title}</div>
              <div className="hub-event-meta">{nextEvent.starts_at ? new Date(nextEvent.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + new Date(nextEvent.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}{nextEvent.going_count ? ` · ${nextEvent.going_count} going` : ''}</div>
              <div className="hub-cta">{nextEvent.my_status === 'going' ? 'View details ›' : 'RSVP ›'}</div>
            </div>
          </a>
        ) : null}
      </div>

      <div className="hub-divider" />

      {/* The feed + forums sidebar */}
      <div className="hub-feed-wrap">
        <div>
          <div className="hub-sec-head"><div className="hub-sec-title">The feed</div></div>
          {feed.state === 'ready' && feed.items.length > 0 ? (
          <div className="hub-feed">
          {feed.items.map(it => it.kind === 'article_comments' ? (
            <div className="hfc" key={it.id}>
              <div className="hfc-info">
                <a className="hfc-title" href={it.article_slug ? `/post/${it.article_slug}` : '/portal'}>{it.article_title}</a>
                <div className="hfc-meta-row">
                  {it.article_theme && <a className="hfc-theme" href={`/portal/library?theme=${encodeURIComponent(it.article_theme)}`} onClick={e => e.stopPropagation()}><svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg>{it.article_theme}</a>}
                  {it.article_date && <span className="hfc-date">{new Date(it.article_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </div>
                {it.article_author_name && (
                  <div className="hfc-author">
                    {it.article_author_photo
                      ? <img className="hfc-author-photo" src={it.article_author_photo} alt="" />
                      : <div className="hfc-author-photo-ph" />}
                    <span className="hfc-author-name">By {it.article_author_name}</span>
                  </div>
                )}
              </div>
              <div className="hfc-img-wrap">
                {it.article_cover
                  ? <img className="hfc-img" src={it.article_cover} alt="" loading="lazy" />
                  : <div className="hfc-img-ph" />}
              </div>
              <div className="hfc-comments">
                {it.comments.map(c => (
                  <div className="hfc-comment" key={c.id}>
                    <div className="hfc-av">{c.author_avatar ? <img src={c.author_avatar} alt="" /> : (c.author_name || 'M')[0].toUpperCase()}</div>
                    <div className="hfc-cbody">
                      <div className="hfc-cname">{c.author_name}</div>
                      <div className="hfc-ctext">{c.body}</div>
                      <div className="hfc-cmeta">
                        <span className="hfc-ctime">{timeAgo(c.ts)}</span>
                        <button className={`hfc-like${c.liked_by_me ? ' liked' : ''}`} onClick={() => toggleLike(c.id)}>
                          <span className="hfc-like-icon">{c.liked_by_me ? '♥' : '♡'}</span>
                          {c.like_count > 0 && <span>{c.like_count}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {it.article_slug && (
                <a className="hfc-read-btn" href={`/post/${it.article_slug}`}>Read the article →</a>
              )}
            </div>
          ) : it.kind === 'blogpost' ? (
            <a className="hub-feed-item" key={`bp-${it.id}`} href={`/portal/blog/${it.id}`}>
              {it.cover_image_url ? <div className="hub-feed-thumb"><img src={it.cover_image_url} alt="" loading="lazy" /></div> : <div className="hub-feed-avatar">{it.author_avatar ? <img src={it.author_avatar} alt="" /> : (it.author_name || 'M')[0].toUpperCase()}</div>}
              <div className="hub-feed-body">
                <div className="hub-feed-kind" style={it.community ? {} : { color: '#4a6fd4' }}>{it.community ? 'From the community' : 'Member blog'} · {it.author_name}</div>
                <div className="hub-feed-title">{it.title}</div>
                {it.body && <div className="hub-feed-text">{it.body}</div>}
                <div className="hub-feed-meta">{timeAgo(it.ts)}</div>
              </div>
            </a>
          ) : it.kind === 'post' ? (
            <a className="hub-feed-item" key={`p-${it.id}`} href={`/portal/members/${it.author_id}`}>
              <div className="hub-feed-avatar">{it.author_avatar ? <img src={it.author_avatar} alt="" /> : (it.author_name || 'M')[0].toUpperCase()}</div>
              <div className="hub-feed-body">
                <div className="hub-feed-kind">{it.author_name}{it.author_headline ? <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--muted)', fontWeight: 400 }}> · {it.author_headline}</span> : ''}</div>
                {it.body && <div className="hub-feed-text" style={{ marginTop: 3 }}>{it.body}</div>}
                {it.image_url && <img src={it.image_url} alt="" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 220, borderRadius: 8, display: 'block' }} />}
                {it.video_url && <div style={{ marginTop: 8, position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}><iframe src={it.video_url} title="Video" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} /></div>}
                {it.link && (
                  <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {it.link.image && <img src={it.link.image} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '8px 10px', fontSize: 12.5, color: '#333' }}>{it.link.title || it.link.url}</div>
                  </div>
                )}
                <div className="hub-feed-meta">{timeAgo(it.ts)}</div>
              </div>
            </a>
          ) : it.kind === 'bookclub' ? (
            <a className="hub-feed-item" key={`b-${it.id}`} href={`/portal/reading-room/${it.book_id}/${it.id}`}>
              <div className="hub-feed-avatar">{it.author_avatar ? <img src={it.author_avatar} alt="" /> : (it.author_name || 'P')[0].toUpperCase()}</div>
              <div className="hub-feed-body">
                <div className="hub-feed-kind">Book club · {it.book_title}</div>
                <div className="hub-feed-title">{it.title}</div>
                {it.body && <div className="hub-feed-text">{it.body}</div>}
                <div className="hub-feed-meta">{it.author_name} · {timeAgo(it.ts)}</div>
              </div>
            </a>
          ) : it.kind === 'forum' ? (
            <a className="hub-feed-item" key={`f-${it.id}`} href={`/portal/forums/${it.forum_id}/${it.id}`}>
              <div className="hub-feed-avatar">{it.author_avatar ? <img src={it.author_avatar} alt="" /> : (it.author_name || 'M')[0].toUpperCase()}</div>
              <div className="hub-feed-body">
                <div className="hub-feed-kind">Discussion · {it.forum_name}</div>
                <div className="hub-feed-title">{it.title}</div>
                {it.body && <div className="hub-feed-text">{it.body}</div>}
                <div className="hub-feed-meta">{it.author_name} · {timeAgo(it.ts)}</div>
              </div>
            </a>
          ) : (
            <a className="hub-feed-item" key={`c-${it.id}`} href={it.article_slug ? `/post/${it.article_slug}` : '/portal'}>
              {it.article_cover ? <div className="hub-feed-thumb"><img src={it.article_cover} alt="" loading="lazy" /></div> : <div className="hub-feed-avatar">{it.author_avatar ? <img src={it.author_avatar} alt="" /> : (it.author_name || 'M')[0].toUpperCase()}</div>}
              <div className="hub-feed-body">
                <div className="hub-feed-kind">Comment</div>
                <div className="hub-feed-title">{it.author_name}{it.article_title ? <span style={{ fontWeight: 400, color: 'var(--muted)' }}> on {it.article_title}</span> : ''}</div>
                <div className="hub-feed-text">{it.body}</div>
                <div className="hub-feed-meta">{timeAgo(it.ts)}</div>
              </div>
            </a>
          ))}
        </div>
          ) : feed.state === 'loading' ? (
            <div className="hub-stub">Loading the feed…</div>
          ) : (
            <div className="hub-stub">
              <strong>The feed is quiet for now.</strong> Comments, forum threads, and book-club discussions will show up here as the community gets going.
            </div>
          )}
        </div>

        {/* Forums sidebar */}
        <aside className="hub-forums-sidebar">
          <div className="hub-fsb-title">Forums</div>
          {forums.length > 0 && (
            <div className="hub-fsb-card">
              {forums.slice(0, 6).map(f => (
                <a key={f.id} className="hub-fsb-forum" href={`/portal/forums/${f.id}`}>
                  {(f.avatar_url || f.cover_image_url)
                    ? <img className="hub-fsb-thumb" src={f.avatar_url || f.cover_image_url} alt="" loading="lazy" style={undefined} />
                    : <div className="hub-fsb-thumb-ph" />}
                  <div className="hub-fsb-body">
                    <div className="hub-fsb-name">{f.name}</div>
                    <div className="hub-fsb-row">
                      <span className="hub-fsb-meta">{f.member_count || 0} {(f.member_count || 0) === 1 ? 'member' : 'members'}{f.new_posts > 0 ? '' : f.thread_count ? ` · ${f.thread_count} posts` : ''}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {f.new_posts > 0 && <span className="hub-fsb-new">{f.new_posts} new</span>}
                        {f.joined ? <span className="hub-fsb-joined">✓ Joined</span> : <span className="hub-fsb-join">Join</span>}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
          {proposedDone && <div style={{ fontSize: 12.5, color: '#2d8f5a', background: '#eaf6ef', border: '1px solid #b7e0c8', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>Proposal sent — a Master Admin will review it.</div>}
          <button className="hub-fsb-propose" onClick={() => setProposeOpen(true)}>+ Propose a forum</button>
        </aside>
      </div>
      {proposeOpen && <ProposeModal getToken={getToken} onClose={() => setProposeOpen(false)} onDone={() => { setProposeOpen(false); setProposedDone(true) }} />}
    </>
  )
}

export default function PortalDashboardPage() {
  return (
    <PortalShell active="dashboard">
      <Hub />
    </PortalShell>
  )
}
