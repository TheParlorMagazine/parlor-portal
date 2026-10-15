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
  const sp = new URL(request.url).searchParams
  const sections = {}
  for (const key of ['announcement', 'issuPromo', 'issueArticles', 'articles', 'featuredEvent', 'otherEvents', 'shopAd', 'support']) {
    if (sp.has(key)) sections[key] = sp.get(key) !== 'false'
  }
  const supportCopy = sp.get('supportCopy') || ''
  const announcementOverride = {
    title: sp.get('annTitle') ?? null,
    text:  sp.get('annText')  ?? null,
    url:   sp.get('annUrl')   ?? null,
    img:   sp.get('annImg')   ?? null,
    btn:   sp.get('annBtn')   ?? null,
  }
  const hasAnnOverride = Object.values(announcementOverride).some(v => v !== null)
  const nl = await gatherNewsletter(db, { baseUrl, sections, supportCopy, announcementOverride: hasAnnOverride ? announcementOverride : null })
  const recipientCount = await countSubscribers(db)
  return Response.json({ ...nl, recipientCount })
}
