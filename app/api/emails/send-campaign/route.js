import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { sendCampaignRow } from '../../../../lib/sendCampaign'

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) {
    return Response.json({ error: 'Sign in required' }, { status: 401 })
  }

  const supabase = serviceClient()
  const me = await memberOf(supabase, user.id)

  if (!me || !['admin', 'editor', 'social_admin'].includes(me.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { campaignId } = await request.json()
  if (!campaignId) return Response.json({ error: 'Missing campaignId' }, { status: 400 })

  const { data: campaign, error: cErr } = await supabase
    .from('email_campaigns').select('*').eq('id', campaignId).single()
  if (cErr || !campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent') return Response.json({ ok: false, status: 'sent', sent: campaign.recipient_count || 0, sentAt: campaign.sent_at, error: 'Already sent' }, { status: 409 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
  const result = await sendCampaignRow(supabase, campaign, { baseUrl })
  if (!result.ok) return Response.json({ ...result, error: result.error || (result.reason === 'empty_segment' ? 'Segment is empty' : 'No eligible recipients') }, { status: result.httpStatus || 502 })
  return Response.json(result)
}
