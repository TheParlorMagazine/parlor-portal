import { createClient } from '@supabase/supabase-js'

// Deletes READ notifications older than 30 days, keeping the fastest-growing
// table permanently bounded. Unread notifications are always kept.
// Hit by a scheduler (netlify/functions/prune-notifications.mjs). CRON_SECRET-gated.
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
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('notifications')
    .delete()
    .eq('read', true)
    .lt('created_at', cutoff)
    .select('id')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, deleted: (data || []).length, cutoff })
}

export async function GET(request) { return run(request) }
export async function POST(request) { return run(request) }
