import { createClient } from '@supabase/supabase-js'
import { sendCampaignRow } from '../../../../lib/sendCampaign'

export async function POST(request) {
  const { campaignId } = await request.json()
  if (!campaignId) return Response.json({ error: 'Missing campaignId' }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: campaign, error: cErr } = await supabase
    .from('email_campaigns').select('*').eq('id', campaignId).single()
  if (cErr || !campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent') return Response.json({ error: 'Already sent' }, { status: 409 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
  const { sent, reason } = await sendCampaignRow(supabase, campaign, { baseUrl })
  if (!sent) return Response.json({ error: reason === 'empty_segment' ? 'Segment is empty' : 'No eligible recipients' }, { status: 400 })
  return Response.json({ sent })
}
