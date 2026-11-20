'use client'

import { useState } from 'react'
import FilmTrailer, { getTrailerEmbed } from '../../_components/FilmTrailer'
import styles from './FilmClubAdmin.module.css'

const screening = {
  title: 'Documentary Screening',
  date: 'December · Date TBA',
  status: 'Draft',
  paidRsvps: 12,
  publicTickets: 8,
  ticketPrice: 9.99,
  hostShare: 0.45,
  licensePrice: 100,
  licenseThreshold: 23,
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const netPerTicket = screening.ticketPrice * (1 - screening.hostShare)
const sponsoredTicketCost = screening.paidRsvps * netPerTicket
const remaining = Math.max(0, screening.licenseThreshold - screening.paidRsvps)
const breakEven = netPerTicket > 0 ? Math.floor(screening.licensePrice / netPerTicket) + 1 : null

const metrics = [
  ['Paid RSVPs', screening.paidRsvps],
  ['License threshold', screening.licenseThreshold],
  ['Public tickets', screening.publicTickets],
  ['Spots to threshold', remaining],
]

export default function FilmClubAdmin() {
  const [trailerUrl, setTrailerUrl] = useState('')
  const [trailerEmbed, setTrailerEmbed] = useState(null)
  const [trailerError, setTrailerError] = useState('')

  function previewTrailer(event) {
    event.preventDefault()
    const embed = getTrailerEmbed(trailerUrl.trim())
    setTrailerEmbed(embed)
    setTrailerError(embed ? '' : 'Enter an HTTPS YouTube or Vimeo video link.')
  }

  return (
    <div className={styles.section}>
      <header className={styles.heading}>
        <div>
          <h1>Film Club</h1>
          <p>Screenings, member RSVPs &amp; licensing</p>
        </div>
        <span className={styles.badge}>Demo data</span>
      </header>

      <dl className={styles.metrics}>
        {metrics.map(([label, value]) => (
          <div key={label} className={styles.metric}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className={styles.card}>
        <div className={styles.heading}>
          <h2>Upcoming screening</h2>
          <span className={styles.badge}>{screening.status}</span>
        </div>
        <div className={styles.screening}>
          <h3>{screening.title}</h3>
          <p>{screening.date}</p>
          <p>Member RSVP registration and public ticket sales</p>
        </div>
        <dl className={styles.costs}>
          <div><dt>Estimated net member ticket cost</dt><dd>{money.format(sponsoredTicketCost)}</dd></div>
          <div><dt>Private screening license</dt><dd>{money.format(screening.licensePrice)}</dd></div>
          <div><dt>Calculated break-even</dt><dd>{breakEven === null ? 'Unavailable' : `${breakEven} RSVPs`}</dd></div>
        </dl>
        <div className={styles.callout}>
          <strong>{remaining === 0 ? 'Review private screening license option' : 'Individual sponsored tickets may be more economical'}</strong>
          <p>{screening.paidRsvps} paid members have RSVP’d. The operational review threshold is {screening.licenseThreshold} RSVPs.</p>
        </div>
        <p className={styles.note}>
          Illustrative estimates use a {money.format(screening.ticketPrice)} ticket price and a {Math.round(screening.hostShare * 100)}% host share.
          Confirm actual costs, licensing permissions, and revenue-share eligibility with the screening provider.
        </p>
      </section>

      <section className={styles.card}>
        <h2>Screening trailer</h2>
        <form className={styles.trailerForm} onSubmit={previewTrailer}>
          <label htmlFor="film-trailer-url">YouTube or Vimeo URL</label>
          <div className={styles.trailerControls}>
            <input id="film-trailer-url" type="url" required value={trailerUrl}
              onChange={event => {
                setTrailerUrl(event.target.value)
                setTrailerError('')
              }} aria-invalid={Boolean(trailerError)} aria-describedby="film-trailer-hint" />
            <button type="submit">Preview trailer</button>
            {trailerEmbed && (
              <button type="button" onClick={() => {
                setTrailerUrl('')
                setTrailerEmbed(null)
                setTrailerError('')
              }}>Clear preview</button>
            )}
          </div>
          <p id="film-trailer-hint">This preview is temporary and resets when you leave the section.</p>
          {trailerError && <p role="alert" className={styles.error}>{trailerError}</p>}
        </form>
        <div className={styles.trailer}>
          <FilmTrailer src={trailerEmbed} title={screening.title} placeholder="Add a trailer URL to preview it here." />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.heading}>
          <div>
            <h2>Member RSVPs</h2>
            <p>Paid subscribers registered for this screening</p>
          </div>
          <span className={styles.badge}>{screening.paidRsvps} registered (demo)</span>
        </div>
        <div className={styles.empty}>RSVP records will appear here once registration is connected.</div>
      </section>
    </div>
  )
}
