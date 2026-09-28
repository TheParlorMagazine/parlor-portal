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
  const nl = await gatherNewsletter(db, { baseUrl })
  if (nl.empty) return Response.json({ error: 'Nothing to send yet — no articles or events.' }, { status: 400 })

  const name = `Newsletter — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const { data: campaign, error } = await db.from('email_campaigns').insert({
    name, subject: nl.subject, body_html: nl.html, status: 'draft', kind: 'newsletter', segment_id: null,
  }).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { sent, reason } = await sendCampaignRow(db, campaign, { baseUrl })
  if (!sent) {
    await db.from('email_campaigns').delete().eq('id', campaign.id)
    return Response.json({ error: reason === 'no_recipients' ? 'No subscribers to send to.' : 'Could not send.' }, { status: 400 })
  }
  return Response.json({ ok: true, sent, subject: nl.subject })
}
