'use client'

import { useEffect, useState } from 'react'
import { filmClubRequest } from '../../lib/filmClubRequest'

export default function FilmClubModeration({ forumId, renderGrants, revision }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const path = `/api/portal/film-club/forums/${forumId}`

  useEffect(() => {
    let current = true
    filmClubRequest(path).then(result => {
      if (current) { setData(result); setError('') }
    }).catch(err => {
      if (current) { setData(null); setError(err.message) }
    })
    return () => { current = false }
  }, [path, revision])

  async function moderate(threadId, action, replyId) {
    setBusy(true)
    setError('')
    try {
      await filmClubRequest(path, 'PATCH', { threadId, action, replyId })
      setData(await filmClubRequest(path))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading discussion…</p>}
      {data && (
        <>
          {renderGrants?.(data.grants)}
          <h2>{data.title} · Discussion moderation</h2>
          {!data.threads.length && <p>No discussion threads yet.</p>}
          {data.threads.map(thread => (
            <article key={thread.id} style={{ borderTop: '1px solid #ddd', padding: '14px 0' }}>
              <h3>{thread.title}</h3>
              <p>{thread.body}</p>
              <p>{thread.status === 'removed' ? 'Hidden' : 'Visible'} · {thread.report_count} reports</p>
              <button disabled={busy} onClick={() => moderate(thread.id, thread.status === 'removed' ? 'restore' : 'hide')}>
                {thread.status === 'removed' ? 'Restore thread' : 'Hide thread'}
              </button>{' '}
              <button disabled={busy} onClick={() => moderate(thread.id, thread.pinned ? 'unpin' : 'pin')}>{thread.pinned ? 'Unpin' : 'Pin'}</button>
              {thread.forum_replies.map(reply => (
                <div key={reply.id} style={{ borderLeft: '2px solid #eee', paddingLeft: 12, marginTop: 12 }}>
                  <p>{reply.body}</p>
                  <p>{reply.status === 'removed' ? 'Hidden' : 'Visible'} · {reply.report_count} reports</p>
                  <button disabled={busy} onClick={() => moderate(thread.id, reply.status === 'removed' ? 'restore' : 'hide', reply.id)}>
                    {reply.status === 'removed' ? 'Restore reply' : 'Hide reply'}
                  </button>
                </div>
              ))}
            </article>
          ))}
        </>
      )}
    </div>
  )
}
