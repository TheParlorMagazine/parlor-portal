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
      <p className="rr-sub">The Parlor book club — what we're reading together, and the conversation around it.</p>

      {state.books.length === 0 ? null : (
        <>
          {featured && (
            <>
              <div className="rr-eyebrow">Currently reading</div>
              <div className="rr-feature">
                <Cover src={featured.cover_image_url} title={featured.title} />
                <div>
                  <div className="rr-f-title">{featured.title}</div>
                  {featured.author && <div className="rr-f-author">by {featured.author}</div>}
                  {featured.blurb && <div className="rr-f-blurb">{featured.blurb}</div>}
                  {featured.meeting_at && state.paid && <div className="rr-meet">📖 Discussion: {fmtMeet(featured.meeting_at)}</div>}
                  {featured.book_url && <div style={{ marginBottom: 8 }}><a className="rr-btn ghost" href={featured.book_url} target="_blank" rel="noopener noreferrer">Get the book ↗</a></div>}
                  {state.paid
                    ? <a className="rr-btn primary" href={`/portal/reading-room/${featured.id}`}>Join the discussion</a>
                    : (
                      <div className="rr-teaser" style={{ marginTop: 16 }}>
                        <h3>Join the conversation</h3>
                        <p>The Reading Room — discussions, prompts, and the live meeting — is open to Reader's Circle and Printing Press members.</p>
                        <a className="rr-btn primary" href="/plans">Become a member</a>
                      </div>
                    )}
                </div>
              </div>
            </>
          )}

          {shelf.length > 0 && (
            <>
              <h2 className="rr-shelf-title">On the shelf</h2>
              {state.paid ? (
                <div className="rr-shelf">
                  {shelf.map(b => (
                    <a className="rr-book" key={b.id} href={`/portal/reading-room/${b.id}`}>
                      <span className={`rr-status ${b.status}`}>{b.status}</span>
                      <Cover src={b.cover_image_url} title={b.title} />
                      <div className="rr-book-title">{b.title}</div>
                      {b.author && <div className="rr-book-author">{b.author}</div>}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rr-shelf" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
                    {shelf.map(b => (
                      <div className="rr-book" key={b.id} style={{ cursor: 'default' }}>
                        <span className={`rr-status ${b.status}`}>{b.status}</span>
                        <Cover src={b.cover_image_url} title={b.title} />
                        <div className="rr-book-title">{b.title}</div>
                        {b.author && <div className="rr-book-author">{b.author}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <a href="/plans" style={{ background: 'var(--ink)', color: '#fff', padding: '10px 22px', borderRadius: 6, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>Unlock the full shelf →</a>
                  </div>
                </div>
              )}
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
