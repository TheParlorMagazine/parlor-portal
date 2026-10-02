'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell from '../_components/PortalShell'
import { evCss } from './evCss'

function dateParts(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { m: '', d: '', t: '' }
  return {
    m: d.toLocaleDateString('en-US', { month: 'short' }),
    d: d.getDate(),
    t: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}
const LOC = { virtual: 'Online', in_person: 'In person', hybrid: 'Hybrid' }

function EventCard({ e, past }) {
  const dp = e.starts_at ? dateParts(e.starts_at) : null
  return (
    <a className="ev-card" href={`/portal/events/${e.id}`}>
      <div className="ev-date">{dp ? <><div className="m">{dp.m}</div><div className="d">{dp.d}</div><div className="t">{dp.t}</div></> : <div className="t">TBA</div>}</div>
      <div style={{ minWidth: 0 }}>
        <span className="ev-loc">{LOC[e.location_type] || 'Event'}</span>
        <div className="ev-c-title">{e.title}</div>
        {e.blurb && <div className="ev-c-blurb">{e.blurb}</div>}
        <div className="ev-c-meta">{e.going_count || 0} {past ? 'attended' : 'going'}{e.host_name ? ` · Hosted by ${e.host_name}` : ''}</div>
      </div>
      {e.my_status === 'going' ? <span className="ev-going-tag">✓ Going</span> : e.my_status === 'waitlist' ? <span className="ev-going-tag" style={{ color: '#b26a00' }}>Waitlisted</span> : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Details →</span>}
    </a>
  )
}

function List() {
  const supabase = useMemo(() => createClient(), [])
  const [d, setD] = useState({ loading: true, upcoming: [], past: [] })

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch('/api/portal/events', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const j = await res.json()
        setD({ loading: false, upcoming: j.upcoming || [], past: j.past || [] })
      } catch { setD({ loading: false, upcoming: [], past: [] }) }
    })()
  }, [supabase])

  return (
    <div className="ev-wrap">
      <style>{evCss}</style>
      <h1 className="ev-h1">Events</h1>
      <p className="ev-sub">Salons, readings, and roundtables. RSVP to join — and to unlock the event’s discussion.</p>

      {d.loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p> : (
        <>
          {d.upcoming.length === 0 && d.past.length === 0 ? (
            <div className="ev-empty"><strong style={{ color: 'var(--ink)' }}>No events scheduled yet.</strong><br />Upcoming salons and readings will show up here.</div>
          ) : (
            <>
              {d.upcoming.length > 0 && <><div className="ev-list">{d.upcoming.map(e => <EventCard key={e.id} e={e} />)}</div></>}
              {d.past.length > 0 && (
                <div className="ev-past">
                  <div className="ev-section">Past events</div>
                  <div className="ev-list">{d.past.map(e => <EventCard key={e.id} e={e} past />)}</div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function EventsPage() {
  return <PortalShell active="events"><List /></PortalShell>
}
