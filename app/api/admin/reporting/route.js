import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { connections, loadReport, ReportingError } from '../../../../lib/reporting'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function gate(request) {
  const user = await requireUser(request)
  if (!user) return reply({ error: 'Sign in required.' }, 401)
  if ((await memberOf(serviceClient(), user.id))?.role !== 'admin') return reply({ error: 'Admin access required.' }, 403)
}
export async function GET(request) {
  const denied = await gate(request)
  if (denied) return denied
  return reply({ connections: connections() })
}
export async function POST(request) {
  const denied = await gate(request)
  if (denied) return denied
  let body
  try { body = await request.json() } catch { return reply({ error: 'Provide a reporting source and dates.' }, 400) }
  try { return reply({ report: await loadReport(body?.source, body?.start, body?.end) }) }
  catch (error) { return reply({ error: error instanceof ReportingError ? error.message : 'Reporting is temporarily unavailable.' }, error instanceof ReportingError ? error.status : 502) }
}
