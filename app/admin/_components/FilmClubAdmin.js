'use client'

import { useEffect, useRef, useState } from 'react'
import { currencyExponent } from '../../../lib/filmTicketPricing'
import { FilmTicketSettings, FilmTicketManagement } from './FilmTicketAdmin'
import FilmClubMediaFields from './FilmClubMediaFields'
import FilmClubModeration from '../../_components/FilmClubModeration'
import { filmClubRequest } from '../../../lib/filmClubRequest'
import styles from './FilmClubAdmin.module.css'

const api = '/api/admin/film-club'
const tabs = ['Overview', 'Screenings', 'Tickets', 'Forums', 'Emails']
const formatDate = value => value ? new Date(value).toLocaleString() : 'Date TBA'

function Overview({ screening, onSave, busy }) {
  if (!screening) return <section className={styles.card}><p>Add a screening to see its ticket totals and licensing estimates.</p></section>

  function save(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const tickets = fields.get('tickets')
    const gross = fields.get('gross')
    onSave({
      action: 'tickets', eventId: screening.event_id,
      publicTickets: tickets === '' ? null : Number(tickets),
      publicGrossCents: gross === '' ? null : Math.round(Number(gross) * 10 ** currencyExponent(screening.currency || 'usd')),
    })
  }

  return (
    <>
      <section className={styles.card}>
        <h2>External ticket sales</h2>
        <p>Enter cumulative totals from your screening provider. Each update replaces the previous totals.</p>
        {screening.ticket_url && <p><a href={screening.ticket_url} target="_blank" rel="noreferrer">Open ticket provider</a></p>}
        <form className={styles.form} onSubmit={save}>
          <label>Tickets sold<input name="tickets" type="number" min="0" max="2147483647" step="1" defaultValue={screening.public_tickets ?? ''} /></label>
          <label>Gross sales ({(screening.currency || 'usd').toUpperCase()})<input name="gross" type="number" min="0" max="21474836.47" step={currencyExponent(screening.currency || 'usd')>0?'0.01':'1'} defaultValue={screening.public_gross_cents==null?'':screening.public_gross_cents/10**currencyExponent(screening.currency || 'usd')} /></label>
          <button disabled={busy}>Save totals</button>
        </form>
        {screening.ticket_reported_at && <p>Last updated {formatDate(screening.ticket_reported_at)}</p>}
      </section>
    </>
  )
}

function ScreeningEmails({ screening, busy, onSave }) {
  if (!screening) return <section className={styles.card}><p>Add a screening first.</p></section>

  function saveBuyers(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const emails = fields.get('buyers').split(/[\s,;]+/).filter(Boolean)
    onSave({ action: 'ticket_buyers', emails }, result => `Saved ${result.count} confirmed ticket buyer emails.`)
  }

  return (
    <>
      <section className={`${styles.card} ${styles.form}`}>
        <h2>After-screening discussion email</h2>
        <p>Invites confirmed paid RSVPs and ticket buyers with matching Parlor accounts to the screening forum. Anyone in both groups gets one invitation.</p>
        <p>{screening.event.ends_at ? `Screening ends ${formatDate(screening.event.ends_at)}.` : 'Set the viewing window end time in Community → Events.'}</p>
        <button type="button" disabled={busy} onClick={() => onSave({
          action: 'discussion_email', enabled: !screening.discussion_email_enabled,
        }, () => screening.discussion_email_enabled ? 'Discussion email paused.' : 'Discussion email enabled.')}>
          {screening.discussion_email_enabled ? 'Pause discussion email' : 'Enable discussion email'}
        </button>
        <p>Invitations are sent after the end time while the discussion is open. Enabling for a past screening makes it eligible on the next run.</p>
      </section>
      <form className={`${styles.card} ${styles.form}`} onSubmit={saveBuyers}>
        <h2>Confirmed Kinema ticket buyers</h2>
        <p>Paste confirmed Kinema buyer emails here, including buyers without Parlor accounts. Saving replaces this screening’s list. The pre-screening reminder uses this list and confirmed RSVPs.</p>
        <label>Ticket buyer emails
          <textarea name="buyers" rows={8} defaultValue={(screening.buyers || []).map(buyer => buyer.email).sort().join('\n')} />
        </label>
        <button disabled={busy}>Save ticket buyers</button>
      </form>
    </>
  )
}

function ScreeningForm({ onAdd, busy }) {
  const submissionId = useRef(null)
  const [trailerUrl, setTrailerUrl] = useState('')
  const [cover, setCover] = useState('')
  const [uploading, setUploading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (busy || uploading) return
    const form = event.currentTarget
    const fields = Object.fromEntries(new FormData(form))
    submissionId.current ||= crypto.randomUUID()
    await onAdd({ ...fields, id: submissionId.current, starts_at: new Date(fields.starts_at).toISOString() })
  }

  return (
    <form className={`${styles.card} ${styles.form}`} onSubmit={submit}>
      <h2>Add screening event</h2>
      <label>Title<input name="title" required maxLength={200} /></label>
      <label>Screening date and time (your local time)<input name="starts_at" type="datetime-local" required /></label>
      <label>Description<textarea name="description" rows={3} maxLength={5000} /></label>
      <label>External tickets URL<input name="ticket_url" type="url" placeholder="https://" /></label>
      <FilmClubMediaFields cover={cover} trailer={trailerUrl} onCover={setCover} onTrailer={setTrailerUrl} disabled={busy} onUploading={setUploading} />
      <p>The screening appears as a draft in Community → Events.</p>
      <button disabled={busy || uploading}>Add screening event</button>
    </form>
  )
}

function ScreeningMediaEditor({ screening, busy, onSave }) {
  const [cover, setCover] = useState(screening.event.cover_image_url || '')
  const [trailer, setTrailer] = useState(screening.trailer_url || '')
  const [uploading, setUploading] = useState(false)
  return <div className={styles.form}>
    <FilmClubMediaFields cover={cover} trailer={trailer} onCover={setCover} onTrailer={setTrailer} disabled={busy} onUploading={setUploading} />
    <div className={styles.mediaActions}>
      <button disabled={busy || uploading} onClick={() => onSave({ action: 'cover', cover_image_url: cover.trim() })}>Save cover image</button>
      <button disabled={busy || uploading} onClick={() => onSave({ action: 'trailer', trailer_url: trailer.trim() })}>Save trailer</button>
    </div>
    <p>Save each change after uploading. Clear its URL and save to remove it.</p>
  </div>
}

export default function FilmClubAdmin() {
  const [tab, setTab] = useState('Overview')
  const [screenings, setScreenings] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [revision, setRevision] = useState(0)
  const screening = screenings.find(item => item.event_id === selectedId) || screenings[0]

  useEffect(() => {
    let current = true
    filmClubRequest(api).then(result => {
      if (current) setScreenings(result.screenings)
    }).catch(err => {
      if (current) setError(err.message)
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [])

  async function save(method, body, success) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await filmClubRequest(api, method, body)
      setNotice(success(result))
      if (body.action === 'invite' || body.action === 'revoke') {
        setRevision(value => value + 1)
      } else {
        setScreenings((await filmClubRequest(api)).screenings)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function invite(event) {
    event.preventDefault()
    const { email, expiry } = Object.fromEntries(new FormData(event.currentTarget))
    save('PATCH', {
      action: 'invite', eventId: screening.event_id, email, expiresAt: new Date(expiry).toISOString(),
    }, result => result.notified ? 'Filmmaker access granted and in-app invitation sent.' : `Access granted. Share this moderation link: ${result.path}`)
  }

  return (
    <div className={styles.section}>
      <header className={styles.heading}>
        <div><h1>Film Club</h1><p>Screenings, ticket reports &amp; discussion moderation</p></div>
        {tab === 'Screenings' && <button className={styles.primary} onClick={() => setAdding(value => !value)}>{adding ? 'Cancel' : '+ Add screening event'}</button>}
      </header>

      <nav className={styles.tabs} aria-label="Film Club sections">
        {tabs.map(label => (
          <button key={label} type="button" aria-pressed={tab === label} onClick={() => {
            setTab(label)
            setNotice('')
          }}>{label}</button>
        ))}
      </nav>

      {loading && <p role="status">Loading screenings…</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!loading && tab !== 'Screenings' && screening && (
        <label className={styles.selector}>Screening
          <select value={screening.event_id} onChange={event => {
            setSelectedId(event.target.value)
            setNotice('')
          }}>
            {screenings.map(item => <option key={item.event_id} value={item.event_id}>{item.event.title} · {formatDate(item.event.starts_at)}</option>)}
          </select>
        </label>
      )}
      {!loading && tab === 'Overview' && (
        <Overview key={`${screening?.event_id}:${screening?.ticket_reported_at}`} screening={screening} busy={busy} onSave={body => save('PATCH', body, () => 'Ticket totals saved.')} />
      )}
      {!loading && tab === 'Overview' && screening && <FilmTicketManagement key={screening.event_id} screening={screening} overview />}
      {!loading && tab === 'Tickets' && screening && <FilmTicketManagement key={screening.event_id} screening={screening} />}
      {tab === 'Screenings' && (
        <>
          {adding && <ScreeningForm busy={busy} onAdd={body => save('POST', body, result => {
            setAdding(false)
            setSelectedId(result.eventId)
            return 'Screening saved as a draft in Events.'
          })} />}
          {screenings.map(item => (
            <section className={styles.card} key={item.event_id}>
              <div className={styles.heading}>
                <div><h2>{item.event.title}</h2><p>{formatDate(item.event.starts_at)}</p></div>
                <span className={styles.badge}>{item.event.status}</span>
              </div>
              {item.event.description && <p>{item.event.description}</p>}
              <FilmTicketSettings screening={item} onChanged={async () => setScreenings((await filmClubRequest(api)).screenings)} />
              <ScreeningMediaEditor key={item.event_id} screening={item} busy={busy}
                onSave={body => save('PATCH', { ...body, eventId: item.event_id }, () => 'Screening media saved.')} />
            </section>
          ))}
          {!screenings.length && !loading && !adding && <p>No screenings yet.</p>}
        </>
      )}
      {!loading && tab === 'Emails' && (
        <ScreeningEmails key={screening?.event_id} screening={screening} busy={busy}
          onSave={(body, success) => save('PATCH', { ...body, eventId: screening.event_id }, success)} />
      )}
      {!loading && tab === 'Forums' && (
        screening?.forum_id ? (
          <>
            <section className={`${styles.card} ${styles.form}`}>
              <h2>Discussion settings</h2>
              {[
                ['discussion_active', 'Visibility in active lists', 'Active', 'Inactive', 'Mark inactive', 'Mark active'],
                ['commenting_open', 'Commenting', 'Open', 'Closed', 'Close commenting', 'Open commenting'],
                ['discussion_archived', 'Archive', 'Archived', 'Available to members after publication', 'Unarchive discussion', 'Archive discussion'],
              ].map(([field, label, on, off, turnOff, turnOn]) => (
                <div key={field} className={styles.heading}>
                  <p><strong>{label}</strong> · {screening[field] ? on : off}</p>
                  <button disabled={busy} onClick={() => save('PATCH', {
                    action: 'discussion', eventId: screening.event_id, field, value: !screening[field],
                  }, () => 'Discussion setting saved.')}>{screening[field] ? turnOff : turnOn}</button>
                </div>
              ))}
            </section>
            <form className={`${styles.card} ${styles.form}`} onSubmit={invite}>
              <h2>Invite a filmmaker</h2>
              <p>Invite an existing Parlor member to co-moderate this discussion until the date you choose.</p>
              <label>Parlor account email<input name="email" type="email" required /></label>
              <label>Access expires (your local time)<input name="expiry" type="datetime-local" required /></label>
              <button disabled={busy}>Invite co-moderator</button>
            </form>
            <div className={`${styles.card} ${styles.moderation}`}>
              {screening.event.status === 'published' && !screening.discussion_archived && <a href={`/portal/forums/${screening.forum_id}`}>Open member discussion</a>}
              <FilmClubModeration key={screening.forum_id} forumId={screening.forum_id} revision={revision} renderGrants={grants => grants.length > 0 && (
                <section className={styles.screening}>
                  <h2>Filmmaker access</h2>
                  {grants.map(grant => (
                    <p key={grant.member_id}>
                      {grant.member?.email || grant.member?.full_name || 'Member'} · Expires {formatDate(grant.expires_at)}{' '}
                      <button disabled={busy} onClick={() => save('PATCH', {
                        action: 'revoke', eventId: screening.event_id, memberId: grant.member_id,
                      }, () => 'Filmmaker access revoked.')}>Revoke access</button>
                    </p>
                  ))}
                </section>
              )} />
            </div>
          </>
        ) : <p>Add a screening with a discussion to start moderating.</p>
      )}
    </div>
  )
}
