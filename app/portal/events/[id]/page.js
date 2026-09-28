'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import PortalShell from '../../_components/PortalShell'
import { evCss } from '../evCss'

const LOC = { virtual: 'Online', in_person: 'In person', hybrid: 'Hybrid' }
function fmtWhen(iso) {
  const d = new Date(iso); if (isNaN(d.getTime())) return 'TBA'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function Detail() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [d, setD] = useState({ loading: true, event: null, my_status: null })
  const [busy, setBusy] = useState(false)

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/events/${id}`, { headers: await auth() })
      if (!res.ok) { setD({ loading: false, event: null, my_status: null }); return }
      const j = await res.json()
      setD({ loading: false, event: j.event, my_status: j.my_status })
    } catch { setD({ loading: false, event: null, my_status: null }) }
  }, [id, auth])
  useEffect(() => { load() }, [load])

  async function rsvp() {
    setBusy(true)
    const res = await fetch(`/api/portal/events/${id}/rsvp`, { method: 'POST', headers: await auth() })
    setBusy(false)
    if (res.ok) await load()
  }
  async function cancel() {
    if (!confirm('Cancel your RSVP? You’ll lose access to the event discussion.')) return
    setBusy(true)
    const res = await fetch(`/api/portal/events/${id}/rsvp`, { method: 'DELETE', headers: await auth() })
    setBusy(false)
    if (res.ok) await load()
  }

  if (d.loading) return <div className="ev-wrap"><style>{evCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!d.event) return <div className="ev-wrap"><style>{evCss}</style><a className="ev-back" href="/portal/events">← Events</a><div className="ev-empty">This event isn’t available.</div></div>

  const e = d.event
  const going = d.my_status === 'going'
  const waitlisted = d.my_status === 'waitlist'
  return (
    <div className="ev-wrap">
      <style>{evCss}</style>
      <a className="ev-back" href="/portal/events">← Events</a>
      {e.cover_image_url && <img className="ev-hero" src={e.cover_image_url} alt={e.title} />}
      <span className="ev-loc">{LOC[e.location_type] || 'Event'}</span>
      <h1 className="ev-d-title">{e.title}</h1>

      <div className="ev-meta-grid">
        {e.starts_at && <div className="ev-meta"><div className="k">When</div><div className="v">{fmtWhen(e.starts_at)}</div></div>}
        <div className="ev-meta"><div className="k">Where</div><div className="v">{e.location_type === 'in_person' ? (e.location || 'In person') : (e.location || 'Online')}</div></div>
        {e.host_name && <div className="ev-meta"><div className="k">Host</div><div className="v">{e.host_name}</div></div>}
        <div className="ev-meta"><div className="k">Going</div><div className="v">{e.going_count}{e.capacity ? ` / ${e.capacity}` : ''}</div></div>
      </div>

      {e.description && <div className="ev-desc">{e.description}</div>}

      <div className="ev-cta">
        {going ? (
          <>
            <span className="ev-btn going">✓ You’re going</span>
            <a className="ev-btn ghost" href={`/api/portal/events/${id}/ics`}>Add to calendar</a>
            {e.forum_id && <a className="ev-btn ghost" href={`/portal/forums/${e.forum_id}`}>Event discussion →</a>}
            <button className="ev-btn ghost" onClick={cancel} disabled={busy} style={{ color: '#c04040' }}>Cancel RSVP</button>
          </>
        ) : waitlisted ? (
          <>
            <span className="ev-btn going" style={{ background: '#fff5e6', color: '#b26a00', borderColor: '#f0d9a8' }}>On the waitlist</span>
            <button className="ev-btn ghost" onClick={cancel} disabled={busy}>Leave waitlist</button>
          </>
        ) : (
          <button className="ev-btn primary" onClick={rsvp} disabled={busy}>{busy ? 'RSVPing…' : 'RSVP'}</button>
        )}
      </div>

      {going && e.join_url && (
        <div className="ev-join">📍 <strong>Join link:</strong> <a href={e.join_url} target="_blank" rel="noopener noreferrer">{e.join_url}</a></div>
      )}
    </div>
  )
}

export default function EventDetailPage() {
  return <PortalShell active="events"><Detail /></PortalShell>
}
