import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { gatherNewsletter } from '../../../../../lib/composeNewsletter'
import { sendCampaignRow } from '../../../../../lib/sendCampaign'

const ROLES = ['admin', 'editor', 'social_admin']

// POST → snapshot the current newsletter and send it to subscribers now. Records
// it as a sent newsletter (email_campaigns kind='newsletter') so the next
// biweekly nudge knows what's new since.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  let retryId = null, sections = {}, supportCopy = '', supportTitle = '', supportBtn1 = '', supportBtn2 = '', announcementOverride = null
  try { const body = await request.json(); retryId = body?.campaignId || null; sections = body?.sections || {}; supportCopy = body?.supportCopy || ''; supportTitle = body?.supportTitle || ''; supportBtn1 = body?.supportBtn1 || ''; supportBtn2 = body?.supportBtn2 || '' ; announcementOverride = body?.announcementOverride || null } catch {}
  if (retryId) {
    const { data: existing, error } = await db.from('email_campaigns').select('*').eq('id', retryId).eq('kind', 'newsletter').single()
    if (error || !existing) return Response.json({ error: 'Newsletter not found.' }, { status: 404 })
    const result = await sendCampaignRow(db, existing, { baseUrl })
    return Response.json({ ...result, campaignId: existing.id, error: result.ok ? undefined : result.error || 'No eligible recipients.' }, { status: result.ok ? 200 : result.httpStatus || 502 })
  }
  const nl = await gatherNewsletter(db, { baseUrl, sections, supportCopy, supportTitle, supportBtn1, supportBtn2, announcementOverride })
  if (nl.empty) return Response.json({ error: 'Nothing to send yet — no articles or events.' }, { status: 400 })

  const name = `Newsletter — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const { data: campaign, error } = await db.from('email_campaigns').insert({
    name, subject: nl.subject, body_html: nl.html, status: 'draft', kind: 'newsletter', segment_id: null,
  }).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const result = await sendCampaignRow(db, campaign, { baseUrl })
  if (!result.ok) return Response.json({ ...result, campaignId: campaign.id, error: result.error || (result.reason === 'no_recipients' ? 'No subscribers to send to.' : 'Could not send.') }, { status: result.httpStatus || 502 })
  return Response.json({ ...result, campaignId: campaign.id, subject: nl.subject })
}
