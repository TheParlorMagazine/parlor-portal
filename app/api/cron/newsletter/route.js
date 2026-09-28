import { createClient } from '@supabase/supabase-js'
import { gatherNewsletter } from '../../../../lib/composeNewsletter'
import { notifyAdmins } from '../../../../lib/notify'
import { isNewsletterWeek } from '../../../../lib/cadence'

function authorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const url = new URL(request.url)
  const bearer = (request.headers.get('authorization') || '').replace('Bearer ', '')
  return bearer === secret || url.searchParams.get('secret') === secret
}

// Biweekly: on newsletter weeks, if there's new content, nudge admins to review
// the live newsletter template and send it. Nothing is created or sent here —
// the newsletter is a living template you send from the Newsletter tab.
async function run(request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const force = url.searchParams.get('force') === '1'

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'

  if (!force && !isNewsletterWeek()) return Response.json({ ok: true, nudged: false, reason: 'off_week' })

  const nl = await gatherNewsletter(db, { baseUrl })
  if (dryRun) return Response.json({ dryRun: true, newsletterWeek: isNewsletterWeek(), hasNew: nl.hasNew, articleCount: nl.articleCount, featured: nl.featured })

  if (!nl.hasNew || nl.empty) return Response.json({ ok: true, nudged: false, reason: 'no_new_content' })

  await notifyAdmins(db, {
    type: 'system',
    message: `Your bi-weekly newsletter is ready to review & send — ${nl.articleCount} article${nl.articleCount === 1 ? '' : 's'}${nl.featured ? ' + featured event' : ''}.`,
    linkTo: 'admin', linkRef: 'emails',
  })
  return Response.json({ ok: true, nudged: true })
}

export async function GET(request) { return run(request) }
export async function POST(request) { return run(request) }
