import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export async function POST(request) {
  const { campaignId } = await request.json()
  if (!campaignId) return Response.json({ error: 'Missing campaignId' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data: campaign, error: cErr } = await supabase
    .from('email_campaigns').select('*').eq('id', campaignId).single()
  if (cErr || !campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent') return Response.json({ error: 'Already sent' }, { status: 409 })

  // Build recipient list — exclude unsubscribed, require email
  let query = supabase.from('members')
    .select('id, email, name, full_name')
    .neq('status', 'unsubscribed')
    .not('email', 'is', null)
    .not('unsubscribed_at', 'is', 'not null')

  if (campaign.segment_id) {
    const { data: sm } = await supabase
      .from('email_segment_members').select('member_id').eq('segment_id', campaign.segment_id)
    if (sm?.length) query = query.in('id', sm.map(r => r.member_id))
    else return Response.json({ error: 'Segment is empty' }, { status: 400 })
  }

  const { data: members } = await query
  if (!members?.length) return Response.json({ error: 'No eligible recipients' }, { status: 400 })

  const FROM    = process.env.RESEND_FROM || 'The Parlor <onboarding@resend.dev>'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parlor-portal.vercel.app'

  function buildHtml(member) {
    const unsubUrl = `${baseUrl}/api/emails/unsubscribe?id=${member.id}`
    return campaign.body_html + `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e8d4d8;font-size:11px;color:#aaa;text-align:center;font-family:Georgia,serif;">
        The Parlor Magazine &nbsp;·&nbsp;
        <a href="${unsubUrl}" style="color:#aaa;">Unsubscribe</a>
      </div>`
  }

  // Send in batches of 100 (Resend batch limit)
  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId)

  let sent = 0
  const BATCH = 100
  for (let i = 0; i < members.length; i += BATCH) {
    const chunk = members.slice(i, i + BATCH)
    await resend.batch.send(chunk.map(m => ({
      from: FROM,
      to:   m.email,
      subject: campaign.subject,
      ...(campaign.preview_text ? { text: campaign.preview_text } : {}),
      html: buildHtml(m),
    })))
    sent += chunk.length
  }

  await supabase.from('email_campaigns').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    recipient_count: sent,
  }).eq('id', campaignId)

  return Response.json({ sent })
}
