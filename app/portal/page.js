'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import PortalShell, { usePortal, ROLE_LABELS } from './_components/PortalShell'

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

  const newest = lib.items.slice(0, 3)
  const nextEvent = events.items[0] || null

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
        .hub-lib-item { display:block; }
        .hub-lib-thumb { width:100%; aspect-ratio:3/2; border-radius:8px; overflow:hidden; background:#f2ece4; margin-bottom:8px; }
        .hub-lib-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .hub-lib-title { font-family:'thermal-variable', Georgia, serif; font-size:13.5px; font-weight:500; line-height:1.3; color:var(--ink); margin-bottom:3px; }
        a.hub-lib-item:hover .hub-lib-title { text-decoration:underline; text-underline-offset:2px; }
        .hub-lib-meta { font-size:11.5px; color:var(--muted); }

        /* Top row: library (left) + book club pick (right) */
        .hub-top { display:grid; grid-template-columns:1fr 340px; gap:24px; align-items:stretch; }
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

        .hub-feed { display:flex; flex-direction:column; }
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
      <div className="hub-top">
        <div>
          <div className="hub-sec-head">
            <div className="hub-sec-title">New in the Library</div>
            <a className="hub-sec-link" href="/portal/library">see all</a>
          </div>
          {lib.state === 'ready' && newest.length > 0 ? (
            <div className="hub-lib-grid">
              {newest.map(a => (
                <a className="hub-lib-item" key={a.slug} href={a.slug ? `/portal/library/${a.slug}` : '/portal/library'}>
                  <div className="hub-lib-thumb">{a.cover_image_url && <img src={a.cover_image_url} alt="" loading="lazy" />}</div>
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
        ) : (
          <a className="hub-book" href="/portal/reading-room">
            <div className="hub-book-cover hub-book-cover-ph">Book club</div>
            <div className="hub-book-body">
              <div className="hub-label">Book club</div>
              <div className="hub-empty">This month’s pick is on its way.</div>
            </div>
          </a>
        )}
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
        ) : (
          <a className="hub-event" href="/portal/events">
            <div className="hub-event-date"><span className="m">Soon</span></div>
            <div className="hub-event-body">
              <div className="hub-label">Next event</div>
              <div className="hub-empty">No upcoming events yet — salons, readings, and roundtables will appear here.</div>
            </div>
          </a>
        )}
      </div>

      <div className="hub-divider" />

      {/* The feed — community activity */}
      <div className="hub-sec-head"><div className="hub-sec-title">The feed</div></div>
      {feed.state === 'ready' && feed.items.length > 0 ? (
        <div className="hub-feed">
          {feed.items.map(it => it.kind === 'blogpost' ? (
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
              <div className="hub-feed-avatar">{it.author_avatar ? <img src={it.author_avatar} alt="" /> : (it.author_name || 'M')[0].toUpperCase()}</div>
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
