import { Resend } from 'resend'
import { makeUnsubToken } from './unsubToken'

const FROM = process.env.RESEND_FROM || 'The Parlor <onboarding@resend.dev>'

// Newsletter/campaign subscribers: has an email, hasn't unsubscribed, and
// hasn't turned the newsletter off (a null newsletter_subscribed = opted in).
export function subscriberQuery(db) {
  return db.from('members')
    .select('id, email, name, full_name')
    .not('email', 'is', null)
    .is('unsubscribed_at', null)
    .or('newsletter_subscribed.is.null,newsletter_subscribed.eq.true')
}

export async function countSubscribers(db) {
  const { count } = await db.from('members')
    .select('id', { count: 'exact', head: true })
    .not('email', 'is', null)
    .is('unsubscribed_at', null)
    .or('newsletter_subscribed.is.null,newsletter_subscribed.eq.true')
  return count || 0
}

function footer(memberId, baseUrl) {
  const unsubUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${makeUnsubToken(memberId)}`
  const prefsUrl = `${baseUrl}/portal/settings`
  return `
    <div style="margin-top:32px;padding-top:18px;border-top:1px solid #e8d4d8;font-size:11.5px;color:#aaa;text-align:center;font-family:Georgia,serif;line-height:1.7;">
      <div style="font-weight:700;color:#888;">The Parlor Magazine</div>
      <div>You're receiving this because you subscribed to The Parlor.</div>
      <div style="margin-top:6px;">
        <a href="${unsubUrl}" style="color:#aaa;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="${prefsUrl}" style="color:#aaa;text-decoration:underline;">Manage your email &amp; account preferences</a>
      </div>
    </div>`
}

// Sends a campaign/newsletter row to its recipients (Resend batches of 100),
// appending the per-recipient unsubscribe + preferences footer. Marks the row
// 'sending' then 'sent' and returns the count. `db` = service client.
export async function sendCampaignRow(db, campaign, { baseUrl = 'https://theparlormagazine.com' } = {}) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  let query = subscriberQuery(db)
  if (campaign.segment_id) {
    const { data: sm } = await db.from('email_segment_members').select('member_id').eq('segment_id', campaign.segment_id)
    if (!sm?.length) return { sent: 0, reason: 'empty_segment' }
    query = query.in('id', sm.map(r => r.member_id))
  }
  const { data: members } = await query
  if (!members?.length) return { sent: 0, reason: 'no_recipients' }

  await db.from('email_campaigns').update({ status: 'sending' }).eq('id', campaign.id)
  let sent = 0
  const BATCH = 100
  for (let i = 0; i < members.length; i += BATCH) {
    const chunk = members.slice(i, i + BATCH)
    await resend.batch.send(chunk.map(m => ({
      from: FROM, to: m.email, subject: campaign.subject,
      ...(campaign.preview_text ? { text: campaign.preview_text } : {}),
      html: campaign.body_html + footer(m.id, baseUrl),
    })))
    sent += chunk.length
  }
  await db.from('email_campaigns').update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: sent }).eq('id', campaign.id)
  return { sent }
}
