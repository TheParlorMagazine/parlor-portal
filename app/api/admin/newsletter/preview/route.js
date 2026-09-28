import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { gatherNewsletter } from '../../../../../lib/composeNewsletter'
import { countSubscribers } from '../../../../../lib/sendCampaign'

const ROLES = ['admin', 'editor', 'social_admin']

// GET → the CURRENT newsletter as it would send right now (live template).
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const nl = await gatherNewsletter(db, { baseUrl })
  const recipientCount = await countSubscribers(db)
  return Response.json({ ...nl, recipientCount })
}
