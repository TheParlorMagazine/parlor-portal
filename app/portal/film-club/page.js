'use client'

import FilmClubDiscussions from '../_components/FilmClubDiscussions'
import { useState } from 'react'
import Link from 'next/link'
import FilmTrailer, { getTrailerEmbed } from '../../_components/FilmTrailer'
import PortalShell from '../_components/PortalShell'
import styles from './filmClub.module.css'

const film = {
  title: 'The Land We Keep',
  subtitle: 'A documentary about land, memory, and belonging.',
  filmmaker: 'Sample filmmaker',
  runtime: '82 minutes',
  live: 'December 12 · 7:00 PM ET',
  flex: 'December 12–19 · View at your convenience',
  deadline: 'December 10 · 7:00 PM ET',
  price: '$9.99',
  trailerUrl: null,
}

const sections = [
  ['discover', 'Discover'],
  ['screening', 'Screening details'],
  ['discussions', 'Film discussions'],
]

const sampleThreads = [
  { id: 1, title: 'What does it mean to belong to a place?', author: 'Maya Chen', body: 'How do collective memory and land shape our understanding of community?', replies: 8, label: 'Featured' },
  { id: 2, title: 'Questions for the filmmaker', author: 'Film Club Team', body: 'Share questions for our optional post-screening conversation.', replies: 12, label: 'Q&A' },
  { id: 3, title: 'Further reading and resources', author: 'Elena Rossi', body: 'Share books, essays, and reporting related to the film.', replies: 4, label: 'Resources' },
]

function FilmBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.eyebrow}>Featured documentary · Fictional film</div>
      <h2>{film.title}</h2>
      <p>{film.subtitle}</p>
    </div>
  )
}

function TrailerCard() {
  return (
    <section className={styles.card}>
      <h2>Trailer</h2>
      <div className={styles.trailerPlayer}>
        <FilmTrailer src={getTrailerEmbed(film.trailerUrl)} title={film.title} />
      </div>
    </section>
  )
}

function FilmClub() {
  const [view, setView] = useState('discover')
  const [membership, setMembership] = useState('paid')
  const [format, setFormat] = useState('flex')
  const [rsvp, setRsvp] = useState(false)
  const [threads, setThreads] = useState(sampleThreads)
  const [expanded, setExpanded] = useState(null)
  const [composing, setComposing] = useState(false)
  const [notice, setNotice] = useState('')
  const isPaid = membership === 'paid'

  function navigate(section) {
    setView(section)
    setNotice('')
  }

  function publishThread(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = data.get('title').trim()
    const body = data.get('message').trim()
    if (!title || !body) {
      setNotice('Please add a title and message.')
      return
    }
    const thread = { id: crypto.randomUUID(), title, body, author: 'You (demo)', replies: 0, label: 'Member discussion' }
    setThreads(current => [thread, ...current])
    setComposing(false)
    setNotice('Discussion added to this preview.')
  }

  return (
    <div className={styles.club}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>The Parlor Community</p>
          <h1>The Film Club</h1>
          <p>Documentaries, conversations, and perspectives beyond the credits.</p>
        </div>
        <label>
          Preview as
          <select value={membership} onChange={event => {
            setMembership(event.target.value)
            setNotice('')
          }}>
            <option value="paid">Paid member</option>
            <option value="free">Free member</option>
          </select>
        </label>
      </header>

      <nav className={styles.sections} aria-label="Film Club sections">
        {sections.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={view === id} onClick={() => navigate(id)}>{label}</button>
        ))}
        <Link href="/portal/groups">All forums</Link>
      </nav>

      <div role="status">{notice && <p className={styles.notice}>{notice}</p>}</div>

      {view === 'discover' && (
        <>
          <div className={styles.columns}>
            <section className={styles.feature}>
              <FilmBanner />
              <div className={styles.cardBody}>
                <p className={styles.eyebrow}>Upcoming · {film[format]}</p>
                <p>Watch a documentary, join an optional filmmaker Q&amp;A, and continue the conversation in our community forum.</p>
                <div className={styles.actions}>
                  <button className={styles.primary} onClick={() => navigate('screening')}>View screening details</button>
                  <button onClick={() => navigate('discussions')}>Join discussion</button>
                </div>
              </div>
            </section>
            <div className={styles.stack}>
              <TrailerCard />
              <section className={styles.card}>
                <h2>{isPaid ? 'Complimentary viewing' : 'Public screening tickets'}</h2>
                <p>{isPaid ? 'Paid members can RSVP for complimentary viewing.' : `Free members can buy a ${film.price} screening ticket. Discussions are open to all registered members.`}</p>
              </section>
              <section className={styles.card}>
                <h2>Beyond the credits</h2>
                <p>Film discussions stay open after the screening window ends.</p>
                <button onClick={() => navigate('discussions')}>Explore discussions</button>
              </section>
            </div>
          </div>
          <section className={styles.recent}>
            <h2>Recent conversations</h2>
            {threads.slice(0, 2).map(thread => (
              <article key={thread.id} className={styles.card}>
                <button className={styles.thread} onClick={() => {
                  setExpanded(thread.id)
                  navigate('discussions')
                }}>{thread.title}</button>
                <p>{thread.body}</p>
              </article>
            ))}
          </section>
        </>
      )}

      {view === 'screening' && (
        <div className={styles.stack}>
          <FilmBanner />
          <div className={styles.columns}>
            <section className={styles.card}>
              <h2>About the screening</h2>
              <p>A fictional documentary following communities navigating environmental protection, cultural memory, and belonging.</p>
              <dl className={styles.details}>
                <div><dt>Filmmaker</dt><dd>{film.filmmaker}</dd></div>
                <div><dt>Runtime</dt><dd>{film.runtime}</dd></div>
                <div><dt>Viewing</dt><dd>{film[format]}</dd></div>
                <div><dt>RSVP deadline</dt><dd>{film.deadline}</dd></div>
                <div><dt>Q&amp;A</dt><dd>Optional live filmmaker conversation</dd></div>
              </dl>
              <fieldset>
                <legend>Viewing format preview</legend>
                <div className={styles.actions}>
                  <button aria-pressed={format === 'live'} onClick={() => setFormat('live')}>Live screening</button>
                  <button aria-pressed={format === 'flex'} onClick={() => setFormat('flex')}>Flex window</button>
                </div>
                <p>Viewing windows depend on the provider’s licensing terms.</p>
              </fieldset>
            </section>
            <div className={styles.stack}>
              <TrailerCard />
              <section className={styles.card}>
                <h2>{isPaid ? 'Your member reservation' : 'Public screening ticket'}</h2>
                {isPaid ? (
                  <>
                    <p>Paid subscribers receive complimentary access when they RSVP.</p>
                    <button className={styles.primary} onClick={() => {
                      setRsvp(!rsvp)
                      setNotice(rsvp ? 'Demo RSVP cancelled.' : 'Demo RSVP confirmed.')
                    }}>{rsvp ? 'Cancel demo RSVP' : 'RSVP for free'}</button>
                    <p>{rsvp ? 'Demo RSVP confirmed · Viewing access pending' : 'RSVP required for complimentary viewing'}</p>
                  </>
                ) : (
                  <>
                    <p>Free members can purchase a {film.price} screening ticket through the external provider.</p>
                    <button className={styles.primary} onClick={() => setNotice('Demo checkout. This button would open the screening provider’s ticket page.')}>Purchase ticket · External provider</button>
                  </>
                )}
              </section>
            </div>
          </div>
          <section className={styles.card}>
            <h2>Continue the conversation</h2>
            <p>The film discussion stays open after the screening for all registered members.</p>
            <button onClick={() => navigate('discussions')}>Open film discussion</button>
          </section>
        </div>
      )}

      {view === 'discussions' && <FilmClubDiscussions showEmpty />}
      {view === 'discussions' && (
        <section className={styles.stack}>
          <div className={styles.header}>
            <div>
              <h2>Demo discussion · {film.title}</h2>
              <p>Open to registered members. Filmmaker participation welcome.</p>
            </div>
            <button className={styles.primary} aria-expanded={composing} onClick={() => setComposing(!composing)}>
              {composing ? 'Cancel discussion draft' : 'Start a discussion'}
            </button>
          </div>
          {composing && (
            <form className={styles.card} onSubmit={publishThread}>
              <label>Title<input name="title" maxLength={160} required /></label>
              <label>Message<textarea name="message" rows={3} maxLength={4000} required /></label>
              <button className={styles.primary}>Publish demo discussion</button>
            </form>
          )}
          <div className={styles.card}>
            {threads.map(thread => (
              <article key={thread.id} className={styles.discussion}>
                <h3>
                  <button className={styles.thread} aria-expanded={expanded === thread.id} onClick={() => setExpanded(expanded === thread.id ? null : thread.id)}>{thread.title}</button>
                  <span className={styles.badge}>{thread.label}</span>
                </h3>
                <p>{thread.body}</p>
                <p className={styles.meta}>Started by {thread.author} · {thread.replies} replies</p>
                {expanded === thread.id && (
                  <form onSubmit={event => {
                    event.preventDefault()
                    setNotice('Demo reply preview. Replies are unavailable in this preview.')
                  }}>
                    <label>Join the conversation<textarea rows={3} placeholder="Write a thoughtful response…" required /></label>
                    <button className={styles.primary}>Post demo reply</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>Prototype · Fictional film, sample dates and prices · Demo interactions reset when you leave or refresh.</footer>
    </div>
  )
}

export default function FilmClubPage() {
  return <PortalShell active="filmclub" returnTo="/portal/film-club"><FilmClub /></PortalShell>
}
