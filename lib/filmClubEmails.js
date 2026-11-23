import { renderDefaultEmail } from './emails'
import { deliver } from './sendEmail'

const screeningTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC',
})
const kinemaUrl = 'https://kinema.com'

function escape(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

async function deliverFilmClubEmails(db, { rpc, table, type, subject, variables }) {
  const { data, error } = await db.rpc(rpc)
  if (error) {
    if (['42883', 'PGRST202'].includes(error.code)) return { configured: false, sent: 0, failed: 0 }
    throw error
  }

  let sent = 0
  let failed = 0
  for (const message of data || []) {
    try {
      const vars = { eventTitle: message.title, ...variables(message) }
      const result = await deliver({
        type, to: message.email, subject: subject(message.title),
        html: renderDefaultEmail(type, vars),
        vars: { ...vars, eventTitle: escape(message.title) },
        idempotencyKey: `${type.replaceAll('_', '-')}/${message.id}`,
      })
      if (result?.skipped) continue
      if (!result?.data?.id || result.error) throw new Error('Email was not accepted')
      const { error: trackingError } = await db.from(table)
        .update({ sent_at: new Date().toISOString() }).eq('id', message.id)
      if (trackingError) throw trackingError
      sent++
    } catch {
      failed++
      console.error('Film Club email delivery failed', type, message.id)
    }
  }
  return { configured: true, sent, failed }
}

export function deliverFilmClubDiscussionEmails(db) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com').replace(/\/$/, '')
  return deliverFilmClubEmails(db, {
    rpc: 'claim_film_club_discussion_emails',
    table: 'film_club_discussion_deliveries',
    type: 'film_club_discussion',
    subject: title => `Join the Film Club discussion: ${title}`,
    variables: message => ({ forumUrl: `${site}/portal/forums/${message.forum_id}` }),
  })
}

export function deliverFilmClubReminderEmails(db) {
  return deliverFilmClubEmails(db, {
    rpc: 'claim_film_club_reminder_emails',
    table: 'film_club_reminder_deliveries',
    type: 'film_club_reminder',
    subject: title => `Film Club screening reminder: ${title}`,
    variables: message => ({ eventWhen: screeningTime.format(new Date(message.starts_at)), kinemaUrl }),
  })
}
