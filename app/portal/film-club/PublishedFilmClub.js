'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FilmTicketPurchase, { FilmTicketOrders, filmTicketRequest } from '../../_components/FilmTicketPurchase'
import FilmTrailer, { getTrailerEmbed } from '../../_components/FilmTrailer'
import FilmClubDiscussions from '../_components/FilmClubDiscussions'
import { usePortal } from '../_components/PortalShell'
import styles from './filmClub.module.css'

export default function PublishedFilmClub({ publicView = false }) {
  const [screenings, setScreenings] = useState(null)
  const [returned, setReturned] = useState(false)
  const [error, setError] = useState('')
  const member = usePortal()?.member
  const [eligible, setEligible] = useState(false)

  useEffect(() => {
    setReturned(new URLSearchParams(window.location.search).get('checkout') === 'returned')
    let current = true
    filmTicketRequest('/api/portal/film-club/screenings').then(result => {
      if (current) { setScreenings(result.screenings); setEligible(result.eligible) }
    }).catch(error => {
      if (current) setError(error.message)
    })
    return () => { current = false }
  }, [])

  const active = (screenings || []).filter(item => Date.parse(item.viewing_end || item.event.ends_at || item.event.starts_at) > Date.now())
    .sort((a, b) => Date.parse(a.event.starts_at) - Date.parse(b.event.starts_at))

  return (
    <div className={styles.club}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>The Parlor Community</p>
          <h1>The Film Club</h1>
          <p>Documentaries, conversations, and perspectives beyond the credits.</p>
        </div>
      </header>
      {returned && <p role="status">Your payment is being checked. Your ticket will appear below after payment verification; returning from checkout alone does not confirm payment.</p>}
      {error && <p role="alert">{error}</p>}
      {!screenings && !error && <p role="status">Loading screenings…</p>}
      {screenings && !active.length && <p>No upcoming screenings yet.</p>}
      <div className={styles.recent}>
        {active.map(screening => { const { event_id: id, event, trailer_url: trailer } = screening; return (
          <div className={styles.columns} key={id}>
            <section className={styles.feature}>
              {event.cover_image_url && <img className={styles.screeningCover} src={event.cover_image_url} alt="" loading="lazy" decoding="async" />}
              <div className={styles.banner}>
                <div className={styles.eyebrow}>Film Club screening</div>
                <h2>{event.title}</h2>
                {event.blurb && <p>{event.blurb}</p>}
              </div>
              <div className={styles.cardBody}>
                {event.starts_at && <p>{new Date(event.starts_at).toLocaleString()}</p>}
                {(screening.synopsis || event.description) && <p>{screening.synopsis || event.description}</p>}
                {screening.filmmaker && <p>Filmmaker: {screening.filmmaker}</p>}
                {(screening.runtime || screening.language) && <p>{screening.runtime ? `${screening.runtime} minutes · ` : ''}{screening.language}{screening.subtitles ? ` · Subtitles: ${screening.subtitles}` : ''}</p>}
                {screening.format && <p>Format: {screening.format === 'flex' ? 'Flex viewing' : 'Live screening'}</p>}
                {screening.viewing_start && <p>Viewing window: {new Date(screening.viewing_start).toLocaleString()}{screening.viewing_end ? ` – ${new Date(screening.viewing_end).toLocaleString()}` : ''}</p>}
                {screening.qa && <p>Q&amp;A: {screening.qa}</p>}
                <div className={styles.actions}>
                  <Link href={`/portal/events/${id}`}>Screening details</Link>
                  <FilmTicketPurchase screening={screening} eligible={eligible} />
                </div>
              </div>
            </section>
            <section className={styles.card}>
              <h2>Trailer</h2>
              <div className={styles.trailerPlayer}>
                <FilmTrailer src={getTrailerEmbed(trailer)} title={event.title} poster={event.cover_image_url} />
              </div>
            </section>
          </div>
        )})}
      </div>
      {member && <FilmTicketOrders />}
      <section className={styles.recent}>
        <h2>Film discussions</h2>
        {publicView ? <p><Link href="/portal/film-club">Sign in to join the discussion</Link>. Discussions are open to free and paid registered members; a ticket is not required.</p> : <FilmClubDiscussions showEmpty />}
      </section>
    </div>
  )
}
