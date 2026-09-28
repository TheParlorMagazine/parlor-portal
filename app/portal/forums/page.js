'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell from '../_components/PortalShell'
import { forumCss } from './forumCss'

function List() {
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState({ loading: true, forums: [] })

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch('/api/portal/forums', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const d = await res.json()
        setState({ loading: false, forums: d.forums || [] })
      } catch { setState({ loading: false, forums: [] }) }
    })()
  }, [supabase])

  return (
    <div className="fr-wrap">
      <style>{forumCss}</style>
      <h1 className="fr-h1">Your forums</h1>
      <p className="fr-sub">Forums you’re part of. <a href="/portal/groups" style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Browse all forums →</a></p>

      {state.loading ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
      ) : state.forums.length === 0 ? (
        <div className="fr-empty">
          <strong style={{ color: 'var(--ink)' }}>No discussions yet.</strong><br />
          When you’re invited to a salon or event forum, it’ll appear here.
        </div>
      ) : (
        <div className="fr-list">
          {state.forums.map(f => (
            <a className="fr-card" key={f.id} href={`/portal/forums/${f.id}`}>
              <div className="fr-card-name">
                {f.name}
                {f.my_role === 'host' && <span className="fr-badge-host">Host</span>}
              </div>
              {f.description && <div className="fr-card-desc">{f.description}</div>}
              <div className="fr-card-meta">
                <span>{f.thread_count || 0} thread{f.thread_count === 1 ? '' : 's'}</span>
                <span>{f.member_count || 0} member{f.member_count === 1 ? '' : 's'}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ForumsPage() {
  return <PortalShell active="groups"><List /></PortalShell>
}
