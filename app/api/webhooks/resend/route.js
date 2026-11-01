import { Webhook } from 'svix'
import { serviceClient } from '../../../../lib/apiAuth'
import { trackingEvent } from '../../../../lib/campaignTracking'

export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: 'Webhook is not configured.' }, { status: 503 })
  const raw = await request.text()
  if (raw.length > 131072) return Response.json({ error: 'Payload too large.' }, { status: 413 })
  let payload
  const id = request.headers.get('svix-id') || ''
  try {
    payload = new Webhook(secret).verify(raw, {
      'svix-id': id,
      'svix-timestamp': request.headers.get('svix-timestamp') || '',
      'svix-signature': request.headers.get('svix-signature') || '',
    })
  } catch { return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 }) }
  let event
  try { event = trackingEvent(payload,id) }
  catch { return Response.json({ error: 'Invalid tracking event.' }, { status: 400 }) }
  if (!event) return Response.json({ received: true, ignored: true })
  const { error } = await serviceClient().from('campaign_email_events').upsert(event, { onConflict: 'event_id', ignoreDuplicates: true })
  if (error) return Response.json({ error: 'Tracking event could not be saved.' }, { status: 503 })
  return Response.json({ received: true })
}
