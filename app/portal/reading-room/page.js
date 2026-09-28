'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell from '../_components/PortalShell'
import { rrCss } from './rrCss'

function Cover({ src, title }) {
  if (src) return <img className="rr-cover" src={src} alt={title} />
  return <div className="rr-cover rr-cover-ph">{title}</div>
}
function fmtMeet(iso) {
  if (!iso) return null
  const d = new Date(iso); if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function Room() {
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState({ loading: true, paid: false, books: [] })

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch('/api/portal/book-club', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const d = await res.json()
        setState({ loading: false, paid: !!d.paid, books: d.books || [] })
      } catch { setState({ loading: false, paid: false, books: [] }) }
    })()
  }, [supabase])

  if (state.loading) return <div className="rr-wrap"><style>{rrCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>

  const featured = state.books.find(b => b.status === 'current') || null
  const shelf = state.books.filter(b => b.id !== featured?.id)

  return (
    <div className="rr-wrap">
      <style>{rrCss}</style>
      <h1 className="rr-h1">Reading Room</h1>
      <p className="rr-sub">The Parlor book club — what we’re reading together, and the conversation around it.</p>

      {!state.paid && (
        <div className="rr-teaser">
          <h3>The book club is a paid-member perk</h3>
          <p>Join Reader’s Circle or Printing Press to read along and join the discussions.</p>
          <a className="rr-btn primary" href="/portal/subscriptions">Upgrade to join</a>
        </div>
      )}

      {state.books.length === 0 ? (
        <div className="rr-empty"><strong style={{ color: 'var(--ink)' }}>No selections yet.</strong><br />The first book club pick is on its way.</div>
      ) : (
        <>
          {featured && (
            <>
              <div className="rr-eyebrow">Currently reading</div>
              <div className="rr-feature">
                {featured.book_url && state.paid ? (
                  <a href={featured.book_url} target="_blank" rel="noopener noreferrer"><Cover src={featured.cover_image_url} title={featured.title} /></a>
                ) : <Cover src={featured.cover_image_url} title={featured.title} />}
                <div>
                  <div className="rr-f-title">{featured.title}</div>
                  {featured.author && <div className="rr-f-author">by {featured.author}</div>}
                  {featured.blurb && <div className="rr-f-blurb">{featured.blurb}</div>}
                  {featured.meeting_at && <div className="rr-meet">📖 Discussion: {fmtMeet(featured.meeting_at)}</div>}
                  <div className="rr-actions">
                    {featured.book_url && <a className="rr-btn ghost" href={featured.book_url} target="_blank" rel="noopener noreferrer">Get the book ↗</a>}
                    {state.paid
                      ? <a className="rr-btn primary" href={`/portal/reading-room/${featured.id}`}>Join the discussion</a>
                      : <a className="rr-btn primary" href="/portal/subscriptions">Unlock discussion</a>}
                  </div>
                </div>
              </div>
            </>
          )}

          {shelf.length > 0 && (
            <>
              <h2 className="rr-shelf-title">On the shelf</h2>
              <div className="rr-shelf">
                {shelf.map(b => (
                  <a className="rr-book" key={b.id} href={state.paid ? `/portal/reading-room/${b.id}` : '/portal/subscriptions'}>
                    <span className={`rr-status ${b.status}`}>{b.status}</span>
                    <Cover src={b.cover_image_url} title={b.title} />
                    <div className="rr-book-title">{b.title}</div>
                    {b.author && <div className="rr-book-author">{b.author}</div>}
                  </a>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function ReadingRoomPage() {
  return <PortalShell active="readingroom"><Room /></PortalShell>
}
