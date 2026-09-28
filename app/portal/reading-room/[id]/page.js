'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import PortalShell from '../../_components/PortalShell'
import { rrCss } from '../rrCss'

function timeAgo(iso) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const UP = <svg viewBox="0 0 12 12" fill="none"><path d="M6 2l4 6H2z" fill="currentColor"/></svg>
function Av({ name, src }) { return <div className="rr-av">{src ? <img src={src} alt="" /> : (name || 'P')[0].toUpperCase()}</div> }

function BookDetail() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [d, setD] = useState({ loading: true, book: null, paid: false, prompts: [] })

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/book-club/${id}`, { headers: await auth() })
      const j = await res.json()
      setD({ loading: false, book: j.book || null, paid: !!j.paid, prompts: j.prompts || [] })
    } catch { setD({ loading: false, book: null, paid: false, prompts: [] }) }
  }, [id, auth])
  useEffect(() => { load() }, [load])

  async function vote(p) {
    setD(s => ({ ...s, prompts: s.prompts.map(x => x.id === p.id ? { ...x, upvoted: !x.upvoted, upvote_count: x.upvote_count + (x.upvoted ? -1 : 1) } : x) }))
    const res = await fetch(`/api/portal/prompts/${p.id}/vote`, { method: 'POST', headers: await auth() })
    if (res.ok) { const j = await res.json(); setD(s => ({ ...s, prompts: s.prompts.map(x => x.id === p.id ? { ...x, upvoted: j.upvoted, upvote_count: j.upvote_count } : x) })) }
  }

  if (d.loading) return <div className="rr-wrap"><style>{rrCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!d.book) return <div className="rr-wrap"><style>{rrCss}</style><a className="rr-back" href="/portal/reading-room">← Reading Room</a><div className="rr-empty">This selection isn’t available.</div></div>

  const b = d.book
  return (
    <div className="rr-wrap">
      <style>{rrCss}</style>
      <a className="rr-back" href="/portal/reading-room">← Reading Room</a>

      <div className="rr-feature">
        {b.book_url ? <a href={b.book_url} target="_blank" rel="noopener noreferrer">{b.cover_image_url ? <img className="rr-cover" src={b.cover_image_url} alt={b.title} /> : <div className="rr-cover rr-cover-ph">{b.title}</div>}</a>
          : (b.cover_image_url ? <img className="rr-cover" src={b.cover_image_url} alt={b.title} /> : <div className="rr-cover rr-cover-ph">{b.title}</div>)}
        <div>
          <span className={`rr-status ${b.status}`}>{b.status}</span>
          <div className="rr-f-title">{b.title}</div>
          {b.author && <div className="rr-f-author">by {b.author}</div>}
          {b.blurb && <div className="rr-f-blurb">{b.blurb}</div>}
          {b.book_url && <div className="rr-actions"><a className="rr-btn ghost" href={b.book_url} target="_blank" rel="noopener noreferrer">Get the book ↗</a></div>}
        </div>
      </div>

      <h2 className="rr-shelf-title">Discussion</h2>
      {!d.paid ? (
        <div className="rr-teaser">
          <h3>Join the conversation</h3>
          <p>Book club discussions are open to Reader’s Circle and Printing Press members.</p>
          <a className="rr-btn primary" href="/portal/subscriptions">Upgrade to join</a>
        </div>
      ) : d.prompts.length === 0 ? (
        <div className="rr-empty">No discussion prompts yet — the editors will post questions as we read.</div>
      ) : (
        <div>
          {d.prompts.map(p => {
            const href = `/portal/reading-room/${id}/${p.id}`
            return (
              <div className="rr-prompt" key={p.id}>
                <Av name={p.author_name} src={p.author_avatar} />
                <div>
                  {p.pinned && <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: '#b26a00', marginBottom: 3 }}>Pinned</div>}
                  <a href={href}><div className="rr-prompt-title">{p.title}<span className="rr-editor-tag">Editor prompt</span></div></a>
                  {p.excerpt && <div className="rr-prompt-ex">{p.excerpt}</div>}
                  <div className="rr-prompt-meta"><b>{p.author_name}</b> · {timeAgo(p.last_activity_at || p.created_at)}</div>
                </div>
                <div className="rr-stats">
                  <button className={`rr-votes${p.upvoted ? ' on' : ''}`} onClick={() => vote(p)}>{UP} {p.upvote_count}</button>
                  <a className="rr-time" href={href} style={{ textDecoration: 'none' }}>{p.reply_count} repl{p.reply_count === 1 ? 'y' : 'ies'}</a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function BookDetailPage() {
  return <PortalShell active="readingroom"><BookDetail /></PortalShell>
}
