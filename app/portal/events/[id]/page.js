'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import PortalShell from '../../_components/PortalShell'
import { evCss } from '../evCss'
import { confirmDialog } from '../../../../lib/confirmDialog'

const LOC = { virtual: 'Online', in_person: 'In person', hybrid: 'Hybrid' }
function fmtWhen(iso) {
  const d = new Date(iso); if (isNaN(d.getTime())) return 'TBA'
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'shortGeneric', timeZone: tz })
  return `${date} · ${time}`
}

function Detail() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [d, setD] = useState({ loading: true, event: null, my_status: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attendees, setAttendees] = useState([])

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/events/${id}`, { headers: await auth() })
      if (!res.ok) { setD({ loading: false, event: null, my_status: null }); return }
      const j = await res.json()
      setD({ loading: false, ...j })
      if (j.can_manage) {
        const response = await fetch(`/api/portal/events/${id}/attendees`, { headers: await auth() })
        if (response.ok) setAttendees((await response.json()).attendees || [])
        else setError('Could not load attendees.')
      }
    } catch { setD({ loading: false, event: null, my_status: null }) }
  }, [id, auth])
  useEffect(() => { load() }, [load])

  async function action(method, body) {
    setBusy(true); setError('')
    try {
      const url = `/api/portal/events/${id}/${body ? 'attendees' : 'rsvp'}`
      const res = await fetch(url, { method, headers: { ...(await auth()), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
      if (!res.ok) throw new Error((await res.json()).error || 'Could not update RSVP')
      await load()
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  const rsvp = () => action('POST')
  async function cancel() {
    if (await confirmDialog('Cancel your RSVP? Your forum membership will stay unchanged.')) await action('DELETE')
  }
  async function manage(member_id, actionName) {
    if (await confirmDialog(actionName === 'promote' ? 'Confirm this attendee? This can override queue order, but not capacity.' : 'Cancel this member’s RSVP?')) {
      await action('PATCH', { member_id, action: actionName })
    }
  }

  if (d.loading) return <div className="ev-wrap"><style>{evCss}</style><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!d.event) return <div className="ev-wrap"><style>{evCss}</style><a className="ev-back" href="/portal/events">← Events</a><div className="ev-empty">This event isn’t available.</div></div>

  const e = d.event
  const host = d.my_status === 'host'
  const going = d.my_status === 'going' || host
  const waitlisted = d.my_status === 'waitlist'
  const ended = e.ends_at || e.starts_at ? new Date(e.ends_at || e.starts_at).getTime() <= Date.now() : false
  return (
    <div className="ev-wrap">
      <style>{evCss}</style>
      <a className="ev-back" href="/portal/events">← Events</a>
      {e.cover_image_url && <img className="ev-hero" src={e.cover_image_url} alt={e.title} />}
      <span className="ev-loc">{LOC[e.location_type] || 'Event'} · {e.is_public ? 'All Parlor members' : 'Forum members only'}</span>
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
            <span className="ev-btn going">{host ? 'Host/admin access · no RSVP needed' : '✓ You’re going'}</span>
            <a className="ev-btn ghost" href={`/api/portal/events/${id}/ics`}>Add to calendar</a>
            {e.forum_id && d.can_access_forum && <a className="ev-btn ghost" href={`/portal/forums/${e.forum_id}`}>Event discussion →</a>}
            {!host && <button className="ev-btn ghost" onClick={cancel} disabled={busy} style={{ color: '#c04040' }}>Cancel RSVP</button>}
          </>
        ) : waitlisted ? (
          <>
            <span className="ev-btn going" style={{ background: '#fff5e6', color: '#b26a00', borderColor: '#f0d9a8' }}>On the waitlist · position {d.queue_position}</span>
            <button className="ev-btn ghost" onClick={cancel} disabled={busy}>Leave waitlist</button>
          </>
        ) : (
          <button className="ev-btn primary" onClick={rsvp} disabled={busy || ended}>{ended ? 'Event ended' : busy ? 'RSVPing…' : 'RSVP'}</button>
        )}
      </div>

      {error && <p role="alert" style={{ color: '#a02030' }}>{error}</p>}
      {waitlisted && <p>Your attendance is not confirmed. We’ll notify you if a place opens.</p>}
      {e.is_public && e.forum_id && !d.can_access_forum && <p>Event registration does not join the host’s forum. You can request membership separately from Forums.</p>}
      {d.can_manage && <section style={{ marginTop: 28 }}>
        <h2>Attendees and waitlist</h2>
        <p>Hosts and admins are excluded from this list and do not use capacity.</p>
        {!attendees.length && <p>No registrations yet.</p>}
        {attendees.map(person => <div key={person.member_id} style={{ borderTop: '1px solid #ddd', padding: '12px 0', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span>{person.full_name} · {person.status === 'waitlist' ? `Waitlist #${person.queue_position}` : 'Going'}</span>
          {person.status === 'waitlist' && <button className="ev-btn ghost" disabled={busy || (e.capacity != null && e.going_count >= e.capacity)} onClick={() => manage(person.member_id, 'promote')}>Confirm place</button>}
          <button className="ev-btn ghost" disabled={busy} onClick={() => manage(person.member_id, 'remove')}>Cancel RSVP</button>
        </div>)}
      </section>}
      {going && e.join_url && (
        <div className="ev-join">📍 <strong>Join link:</strong> <a href={e.join_url} target="_blank" rel="noopener noreferrer">{e.join_url}</a></div>
      )}
    </div>
  )
}

export default function EventDetailPage() {
  return <PortalShell active="events"><Detail /></PortalShell>
}
