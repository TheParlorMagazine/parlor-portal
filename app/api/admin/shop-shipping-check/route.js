import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { checkShippoConnection } from '../../../../lib/checkShippoConnection'

export async function GET(request) {
  const headers = { 'Cache-Control': 'no-store' }
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401, headers })
  const member = await memberOf(serviceClient(), user.id)
  if (!member || !['admin', 'editor'].includes(member.role)) return Response.json({ error: 'Forbidden' }, { status: 403, headers })
  return Response.json(await checkShippoConnection(), { headers })
}
