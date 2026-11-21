'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { hasEndedPaidMembership, isPaidPlan } from '../../../lib/plans'
import { filmClubRequest } from '../../../lib/filmClubRequest'
import FilmTrailer, { getTrailerEmbed } from '../../_components/FilmTrailer'
import FilmClubDiscussions from '../_components/FilmClubDiscussions'
import { usePortal } from '../_components/PortalShell'
import styles from './filmClub.module.css'

export default function PublishedFilmClub() {
  const [screenings, setScreenings] = useState(null)
  const [error, setError] = useState('')
  const member = usePortal()?.member
  const paid = isPaidPlan(member?.plan) && !hasEndedPaidMembership(member)

  useEffect(() => {
    let current = true
    filmClubRequest('/api/portal/film-club/screenings').then(result => {
      if (current) setScreenings(result.screenings)
    }).catch(error => {
      if (current) setError(error.message)
    })
    return () => { current = false }
  }, [])

  const active = (screenings || []).filter(item => Date.parse(item.event.ends_at || item.event.starts_at) > Date.now())
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
      {error && <p role="alert">{error}</p>}
      {!screenings && !error && <p role="status">Loading screenings…</p>}
      {screenings && !active.length && <p>No upcoming screenings yet.</p>}
      <div className={styles.recent}>
        {active.map(({ event_id: id, event, trailer_url: trailer, ticket_url: tickets }) => (
          <div className={styles.columns} key={id}>
            <section className={styles.feature}>
              <div className={styles.banner}>
                <div className={styles.eyebrow}>Film Club screening</div>
                <h2>{event.title}</h2>
                {event.blurb && <p>{event.blurb}</p>}
              </div>
              <div className={styles.cardBody}>
                {event.starts_at && <p>{new Date(event.starts_at).toLocaleString()}</p>}
                {event.description && <p>{event.description}</p>}
                <div className={styles.actions}>
                  <Link href={`/portal/events/${id}`}>{paid ? 'Screening details and RSVP' : 'Screening details'}</Link>
                  {!paid && tickets && <a href={tickets} target="_blank" rel="noreferrer">Get a Kinema ticket</a>}
                </div>
              </div>
            </section>
            <section className={styles.card}>
              <h2>Trailer</h2>
              <div className={styles.trailerPlayer}>
                <FilmTrailer src={getTrailerEmbed(trailer)} title={event.title} />
              </div>
            </section>
          </div>
        ))}
      </div>
      <section className={styles.recent}>
        <h2>Film discussions</h2>
        <FilmClubDiscussions showEmpty />
      </section>
    </div>
  )
}
