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
  if (campaign.status === 'sent') return Response.json({ error: 'Already sent' }, { status: 409 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
  const { sent, reason } = await sendCampaignRow(supabase, campaign, { baseUrl })
  if (!sent) return Response.json({ error: reason === 'empty_segment' ? 'Segment is empty' : 'No eligible recipients' }, { status: 400 })
  return Response.json({ sent })
}
