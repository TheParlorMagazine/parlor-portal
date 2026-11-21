import { renderDefaultEmail } from './emails'
import { deliver } from './sendEmail'

function escape(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

export async function deliverFilmClubDiscussionEmails(db) {
  const { data, error } = await db.rpc('claim_film_club_discussion_emails')
  if (error) {
    if (['42883', 'PGRST202'].includes(error.code)) return { configured: false, sent: 0, failed: 0 }
    throw error
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com').replace(/\/$/, '')
  const type = 'film_club_discussion'
  let sent = 0
  let failed = 0
  for (const message of data || []) {
    try {
      const forumUrl = `${site}/portal/forums/${message.forum_id}`
      const result = await deliver({
        type, to: message.email, subject: `Join the Film Club discussion: ${message.title}`,
        html: renderDefaultEmail(type, { eventTitle: message.title, forumUrl }),
        vars: { eventTitle: escape(message.title), forumUrl },
        idempotencyKey: `film-club-discussion/${message.id}`,
      })
      if (result?.skipped) continue
      if (!result?.data?.id || result.error) throw new Error('Email was not accepted')
      const { error: trackingError } = await db.from('film_club_discussion_deliveries')
        .update({ sent_at: new Date().toISOString() }).eq('id', message.id)
      if (trackingError) throw trackingError
      sent++
    } catch {
      failed++
      console.error('Film Club discussion email delivery failed', message.id)
    }
  }
  return { configured: true, sent, failed }
}
