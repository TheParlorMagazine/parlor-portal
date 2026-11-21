'use client'

import { useEffect, useState } from 'react'
import { filmClubRequest } from '../../../lib/filmClubRequest'

export default function CommentingControls({ kind, id, children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const path = `/api/portal/commenting?kind=${kind}&id=${id}`

  useEffect(() => {
    let current = true
    filmClubRequest(path).then(result => {
      if (current) setState(result)
    }).catch(() => {
      if (current) setError('Could not load commenting settings.')
    })
    return () => { current = false }
  }, [path])

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      await filmClubRequest(path, 'PATCH', { locked: !state.locked })
      setState(await filmClubRequest(path))
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  const closed = state?.locked || state?.forumOpen === false
  return (
    <>
      {state?.canManage && (
        <button type="button" className="fr-linkbtn" disabled={busy} onClick={toggle}>
          {kind === 'forum'
            ? (state.locked ? 'Reopen forum commenting' : 'Close forum commenting')
            : (state.locked ? 'Unlock replies' : 'Lock replies')}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {closed && <p role="status">{state.forumOpen === false ? 'Commenting is closed in this forum.' : 'Replies are locked.'} You can still read the discussion.</p>}
      {children(!state || closed)}
    </>
  )
}
