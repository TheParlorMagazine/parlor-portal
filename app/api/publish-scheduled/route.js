import { createClient } from '@supabase/supabase-js'
import { hasDisclaimerBlock } from '../../../lib/memberPosts'

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

  // Candidates due to publish.
  const { data: due, error: dueErr } = await supabase
    .from('articles')
    .select('id, title, slug, media_type, body, author_approved_at, source_member_post_id')
    .lte('scheduled_at', now)
    .eq('published', false)
    .not('scheduled_at', 'is', null)
  if (dueErr) {
    console.error('publish-scheduled error:', dueErr)
    return Response.json({ error: dueErr.message }, { status: 500 })
  }

  // Member posts must clear the same gates as manual publishing.
  const ready = [], held = []
  for (const a of due || []) {
    if (a.media_type === 'member_post' && (!hasDisclaimerBlock(a.body) || !a.author_approved_at)) held.push(a.id)
    else ready.push(a.id)
  }

  let published = []
  if (ready.length) {
    const { data, error } = await supabase
      .from('articles').update({ published: true, date_published: now }).in('id', ready)
      .select('id, title, slug')
    if (error) { console.error('publish-scheduled error:', error); return Response.json({ error: error.message }, { status: 500 }) }
    published = data || []

    // Reveal the linked community post for any member posts that just published.
    const subIds = (due || []).filter(a => ready.includes(a.id) && a.media_type === 'member_post' && a.source_member_post_id).map(a => a.source_member_post_id)
    if (subIds.length) await supabase.from('member_submissions').update({ status: 'published', feed_visible: true }).in('id', subIds)
  }

  return Response.json({ published: published.length, articles: published, held: held.length })
}
