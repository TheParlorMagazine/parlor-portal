import { Resend } from 'resend'
import { makeUnsubToken } from './unsubToken'
import { campaignEmailHtml } from './campaignTemplate'

const FROM = process.env.RESEND_FROM || 'The Parlor <welcome@theparlormagazine.com>'

// Newsletter/campaign subscribers: has an email, hasn't unsubscribed, and
// hasn't turned the newsletter off (a null newsletter_subscribed = opted in).
export function subscriberQuery(db) {
  return db.from('members')
    .select('id, email, full_name')
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

export function footer(memberId, baseUrl) {
  const unsubUrl = memberId
  ? `${baseUrl}/api/newsletter/unsubscribe?token=${makeUnsubToken(memberId)}`
  : '#'
  const prefsUrl = `${baseUrl}/portal/settings`
  return `
    <div style="margin-top:32px;padding-top:18px;border-top:1px solid #e8d4d8;font-size:11.5px;color:#aaa;text-align:center;font-family:Georgia,serif;line-height:1.7;">
      <div style="font-weight:700;color:#888;">The Parlor Magazine</div>
      <div>You're receiving this email because you subscribed to The Parlor Magazine.</div>
      <div style="margin-top:6px;">
        <a href="${unsubUrl}" style="color:#aaa;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="${prefsUrl}" style="color:#aaa;text-decoration:underline;">Manage your email &amp; account preferences</a>
      </div>
      <div style="margin-top:8px;color:#aaa;">
        © 2026 The Parlor Magazine, Inc. All Rights Reserved.
      </div>
    </div>`
}
export function emailWithFooter(html, memberId, baseUrl) {
  const footerHtml = footer(memberId, baseUrl)

  if (html.includes('</div>')) {
    const lastDiv = html.lastIndexOf('</div>')
    return html.slice(0, lastDiv) +
      footerHtml +
      html.slice(lastDiv)
  }

  return html + footerHtml
}
// "sent" means every recipient was accepted by Resend, not delivered to an
// inbox. Partial or unknown outcomes require review before another send.
export async function sendCampaignRow(db, campaign, { baseUrl = 'https://theparlormagazine.com' } = {}) {
  let query = subscriberQuery(db)
  try {
    if (campaign.segment_id) {
      const { data: sm, error } = await db.from('email_segment_members').select('member_id').eq('segment_id', campaign.segment_id)
      if (error) throw new Error('Could not load the selected segment.')
      if (!sm?.length) return { ok: false, sent: 0, reason: 'empty_segment', httpStatus: 400 }
      query = query.in('id', sm.map(r => r.member_id))
    }
    const { data: members, error } = await query
    if (error) throw new Error('Could not load campaign recipients.')
    if (!members?.length) return { ok: false, sent: 0, reason: 'no_recipients', httpStatus: 400 }
    return await sendAcceptedBatches(db, campaign, members, baseUrl)
  } catch (error) {
    return { ok: false, sent: 0, error: error.message, httpStatus: 503 }
  }
}

async function sendAcceptedBatches(db, campaign, members, baseUrl) {
  // Claim the row atomically, before contacting the provider. A crashed or
  // uncertain send is never automatically restarted and duplicated.
  const { data: claimed, error: claimError } = await db.from('email_campaigns')
    .update({ status: 'sending', sent_at: null, recipient_count: 0 })
    .eq('id', campaign.id).in('status', ['draft', 'scheduled', 'failed'])
    .or('recipient_count.is.null,recipient_count.eq.0').select('id').maybeSingle()
  if (claimError) return { ok: false, sent: 0, error: 'Could not reserve this campaign for sending.', httpStatus: 503 }
  if (!claimed) return { ok: false, status: ['sending','sent','partial','uncertain'].includes(campaign.status) ? campaign.status : 'sending', sent: Number(campaign.recipient_count) || 0, error: 'This campaign was already sent, is sending, or needs review. Check its status before retrying.', requiresReview: true, httpStatus: 409 }
  let sent = 0, status = 'failed'
  const total = members.length
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    for (let i = 0; i < total; i += 100) {
      const chunk = members.slice(i, i + 100)
      const messages = chunk.map(m => ({
        from: FROM, to: m.email, subject: campaign.subject,
        ...(campaign.preview_text ? { text: campaign.preview_text } : {}),
        html: campaign.kind === 'newsletter'
          ? emailWithFooter(campaign.body_html, m.id, baseUrl)
          : campaignEmailHtml(campaign.subject, campaign.body_html.replace(/^<!--PARLOR_BLOCKS:[\s\S]*?:PARLOR_BLOCKS-->/, ''), footer(m.id, baseUrl)),
      }))
      // The SDK returns application_error on network failure too. Treat that as
      // unknown, since the provider could have accepted the request already.
      status = 'uncertain'
      const result = await resend.batch.send(messages)
      const ids = result?.data?.data?.filter(item => typeof item.id === 'string' && item.id) || []
      if (result?.error) {
        const rejected = ['missing_required_field','invalid_access','invalid_parameter','invalid_region','rate_limit_exceeded','missing_api_key','invalid_api_Key','invalid_api_key','invalid_from_address','validation_error','not_found','method_not_allowed'].includes(result.error.name)
        if (ids.length) sent += Math.min(new Set(ids.map(item => item.id)).size, chunk.length)
        status = rejected && !ids.length ? (sent ? 'partial' : 'failed') : 'uncertain'
        throw new Error(result.error.message || 'Resend did not accept the batch.')
      }
      const uniqueIds = new Set(ids.map(item => item.id))
      if (ids.length !== chunk.length || uniqueIds.size !== chunk.length) {
        sent += Math.min(uniqueIds.size, chunk.length)
        throw new Error('Resend did not return a complete batch confirmation.')
      }
      sent += chunk.length
      const { data: progress, error } = await db.from('email_campaigns')
        .update({ recipient_count: sent }).eq('id', campaign.id).eq('status', 'sending').select('id').maybeSingle()
      if (error || !progress) throw new Error('Resend accepted the batch, but its progress could not be saved.')
      status = sent ? 'partial' : 'failed'
    }
    const sentAt = new Date().toISOString()
    const { data: completed, error } = await db.from('email_campaigns')
      .update({ status: 'sent', sent_at: sentAt, recipient_count: sent }).eq('id', campaign.id).eq('status', 'sending').select('id').maybeSingle()
    if (error || !completed) { status = 'uncertain'; throw new Error('Resend accepted the emails, but the final campaign status could not be saved.') }
    return { ok: true, status: 'sent', sent, total, sentAt }
  } catch (error) {
    let saveError
    try { ({ error: saveError } = await db.from('email_campaigns').update({ status, recipient_count: sent, sent_at: null }).eq('id', campaign.id).eq('status', 'sending')) }
    catch (error) { saveError = error }
    if (saveError) status = 'uncertain'
    const requiresReview = status !== 'failed'
    return {
      ok: false, status, sent, total, requiresReview, httpStatus: 502,
      error: `${sent} of ${total} recipients confirmed accepted by Resend. ${error.message}${requiresReview ? ' Do not resend until you check Resend for accepted emails.' : ' No emails were confirmed accepted; fix the issue before retrying.'}${saveError ? ' The campaign status could not be saved; check Resend before any retry.' : ''}`,
    }
  }
}
