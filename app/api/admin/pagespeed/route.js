import { unstable_cache } from 'next/cache'
import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { pageSpeedTarget, runPageSpeed, PageSpeedError } from '../../../../lib/pageSpeed'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const cachedAudit = unstable_cache(runPageSpeed, ['pagespeed-audits-v1'], { revalidate: 3600 })
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return reply({ error: 'Sign in required.' }, 401)
  const member = await memberOf(serviceClient(), user.id)
  if (member?.role !== 'admin') return reply({ error: 'Admin access required.' }, 403)
  return null
}

export async function GET(request) {
  const denied = await gate(request)
  if (denied) return denied
  return reply({ configured: Boolean(process.env.GOOGLE_PAGESPEED_API_KEY), cacheMinutes: 60 })
}

export async function POST(request) {
  const denied = await gate(request)
  if (denied) return denied
  let body
  try { body = await request.json() } catch { return reply({ error: 'Provide a page URL and device.' }, 400) }
  try {
    const target = pageSpeedTarget(body?.url, body?.strategy)
    if (!process.env.GOOGLE_PAGESPEED_API_KEY) throw new PageSpeedError('Add GOOGLE_PAGESPEED_API_KEY to the server environment to enable audits.', 503)
    return reply({ report: await cachedAudit(target.url, target.strategy) })
  } catch (error) {
    return reply({ error: error instanceof PageSpeedError ? error.message : 'The audit is temporarily unavailable. Try again later.' }, error instanceof PageSpeedError ? error.status : 502)
  }
}
