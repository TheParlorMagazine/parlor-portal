import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

// PATCH { issueId, intro } → save the newsletter intro blurb for an issue.
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const b = await request.json().catch(() => ({}))
  if (!b.issueId) return Response.json({ error: 'issueId required' }, { status: 400 })
  const patch = {}
  if ('intro' in b) patch.newsletter_intro = (b.intro || '').trim() || null
  if ('image' in b) patch.newsletter_image = (b.image || '').trim() || null
  if ('tagline' in b) patch.newsletter_tagline = (b.tagline || '').trim() || null
  if ('announcement' in b) patch.newsletter_announcement = (b.announcement || '').trim() || null
  if ('announcementUrl' in b) patch.newsletter_announcement_url = (b.announcementUrl || '').trim() || null
  if ('announcementImg' in b) patch.newsletter_announcement_img = (b.announcementImg || '').trim() || null
  if ('announcementTitle' in b) patch.newsletter_announcement_title = (b.announcementTitle || '').trim() || null
  if ('announcementBtn' in b) patch.newsletter_announcement_btn = (b.announcementBtn || '').trim() || null
  if ('sectionTitle' in b) patch.newsletter_section_title = (b.sectionTitle || '').trim() || null
  if ('buttonCopy' in b) patch.newsletter_button_copy = (b.buttonCopy || '').trim() || null
  if ('buttonUrl' in b) patch.newsletter_button_url = (b.buttonUrl || '').trim() || null
  if ('button2Copy' in b) patch.newsletter_button2_copy = (b.button2Copy || '').trim() || null
  if ('button2Url' in b) patch.newsletter_button2_url = (b.button2Url || '').trim() || null
  const { error } = await db.from('issues').update(patch).eq('id', b.issueId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
