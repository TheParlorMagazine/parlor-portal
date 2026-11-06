import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { registerMerchantProject, ReportingError } from '../../../../../lib/reporting'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return reply({ error: 'Sign in required.' }, 401)
  if ((await memberOf(serviceClient(), user.id))?.role !== 'admin') return reply({ error: 'Admin access required.' }, 403)
  let body
  try { body = await request.json() } catch { return reply({ error: 'Provide a developer contact email.' }, 400) }
  if (body?.confirm !== true) return reply({ error: 'Confirm Merchant API project registration first.' }, 400)
  try { return reply(await registerMerchantProject(body.developerEmail)) }
  catch (error) { return reply({ error: error instanceof ReportingError ? error.message : 'Merchant API registration could not be completed.' }, error instanceof ReportingError ? error.status : 502) }
}
