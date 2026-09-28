import { createClient } from '@supabase/supabase-js'
import { sendToSegment } from '../../../../lib/broadcast'

// Sends scheduled inbox broadcasts whose time has come. Hit by a scheduler
// (see netlify/functions/broadcasts.mjs). Protected by CRON_SECRET.
function authorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const url = new URL(request.url)
  const bearer = (request.headers.get('authorization') || '').replace('Bearer ', '')
  return bearer === secret || url.searchParams.get('secret') === secret
}

async function run(request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const now = new Date().toISOString()

  const { data: due, error } = await db
    .from('inbox_broadcasts')
    .select('*')
    .eq('status', 'scheduled')
    .eq('schedule_type', 'scheduled')
    .lte('scheduled_at', now)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let processed = 0
  for (const b of due || []) {
    const senderName = b.created_by ? (await db.from('members').select('full_name').eq('id', b.created_by).single()).data?.full_name : 'The Parlor'
    const sent = await sendToSegment(db, { audience: b.segment, segmentId: b.segment_id, eventRef: b.event_ref, subject: b.subject, body: b.body, senderName, senderId: b.created_by })
    await db.from('inbox_broadcasts').update({ status: 'sent', sent_count: sent, sent_at: new Date().toISOString() }).eq('id', b.id)
    processed++
  }
  return Response.json({ ok: true, processed })
}

export async function GET(request) { return run(request) }
export async function POST(request) { return run(request) }
