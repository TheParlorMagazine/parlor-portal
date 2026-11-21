'use client'

import { useEffect, useState } from 'react'
import { filmClubRequest } from '../../../lib/filmClubRequest'
import { forumCss } from '../forums/forumCss'

function DiscussionCards({ items }) {
  return (
    <div className="fr-list">
      {items.map(item => (
        <a className="fr-card" key={item.forum_id} href={`/portal/forums/${item.forum_id}`}>
          <div className="fr-card-name">{item.event.title} · Discussion</div>
          <div className="fr-card-meta">
            <span>{item.forum.thread_count} {item.forum.thread_count === 1 ? 'thread' : 'threads'}</span>
            {!item.commenting_open && <span>Commenting closed</span>}
          </div>
        </a>
      ))}
    </div>
  )
}

export default function FilmClubDiscussions({ dashboard = false, showEmpty = false }) {
  const [items, setItems] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let current = true
    filmClubRequest('/api/portal/film-club').then(result => {
      if (current) setItems(result.discussions)
    }).catch(() => {
      if (current) setFailed(true)
    })
    return () => { current = false }
  }, [])

  if (failed) return showEmpty ? <p role="alert">Couldn’t load Film Club discussions.</p> : null
  if (!items) return showEmpty ? <p role="status">Loading discussions…</p> : null
  if (!items.length) return showEmpty ? <p>No screening discussions yet.</p> : null

  const now = Date.now()
  const date = item => Date.parse(item.event.starts_at) || 0
  const upcoming = items.filter(item => item.discussion_active && date(item) >= now).sort((a, b) => date(a) - date(b))
  const recent = items.filter(item => item.discussion_active && date(item) < now).sort((a, b) => date(b) - date(a))
  const inactive = items.filter(item => !item.discussion_active).sort((a, b) => date(b) - date(a))
  const active = [...upcoming, ...recent]
  if (dashboard && !active.length) return null

  return (
    <section style={{ margin: '18px 0' }}>
      <style>{forumCss}</style>
      {active.length > 0 && <>
        <h2>Film Club discussions</h2>
        <DiscussionCards items={dashboard ? active.slice(0, 2) : active} />
      </>}
      {!dashboard && inactive.length > 0 && <>
        <h2>Past Film Club discussions</h2>
        <DiscussionCards items={inactive} />
      </>}
    </section>
  )
}
