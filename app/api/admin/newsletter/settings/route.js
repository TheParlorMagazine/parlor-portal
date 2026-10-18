import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await db.from('newsletter_settings').select('sections, support_title, support_btn1, support_btn2').eq('id', 1).maybeSingle()
  return Response.json({
    sections: data?.sections || {},
    supportTitle: data?.support_title || '',
    supportBtn1:  data?.support_btn1  || '',
    supportBtn2:  data?.support_btn2  || '',
  })
}

export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { sections, supportTitle, supportBtn1, supportBtn2 } = body
  if (!sections) return Response.json({ error: 'sections required' }, { status: 400 })
  // Save sections first — this always works (column is in the base migration)
  const { error } = await db.from('newsletter_settings').upsert({ id: 1, sections })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Save support fields separately — silently skip if columns not yet migrated
  if (supportTitle !== undefined || supportBtn1 !== undefined || supportBtn2 !== undefined) {
    await db.from('newsletter_settings').update({
      support_title: supportTitle || null,
      support_btn1:  supportBtn1  || null,
      support_btn2:  supportBtn2  || null,
    }).eq('id', 1).then(() => {}).catch(() => {})
  }

  return Response.json({ ok: true })
}
