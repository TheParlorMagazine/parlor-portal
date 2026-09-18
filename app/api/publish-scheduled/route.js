import { createClient } from '@supabase/supabase-js'

// Called by Vercel Cron (see vercel.json). Publishes articles whose
// scheduled_at has passed. Requires CRON_SECRET env var (set in Vercel
// dashboard) and SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('articles')
    .update({ published: true, date_published: now })
    .lte('scheduled_at', now)
    .eq('published', false)
    .not('scheduled_at', 'is', null)
    .select('id, title, slug')

  if (error) {
    console.error('publish-scheduled error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ published: data?.length ?? 0, articles: data ?? [] })
}
