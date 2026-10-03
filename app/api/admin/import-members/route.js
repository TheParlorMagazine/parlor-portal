import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const ROLES = ['admin', 'editor']

// Bulk-import subscribers AND give each a linked auth account, so when the person
// later signs in with that email (Google / magic link) they land on this exact
// record instead of creating a duplicate free member. Admin-only; uses the service
// role (which the admin's own client can't — it can't call auth.admin.createUser).
//
// POST { records: [{ email, full_name?, plan?, joined_at?, subscription_status?,
//                     notes?, newsletter_subscribed?, print_subscriber? }] }
// → { created, updated, skipped, errors }
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!me || !ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  let body = {}
  try { body = await request.json() } catch {}
  const records = Array.isArray(body.records) ? body.records : []
  if (!records.length) return Response.json({ error: 'No records' }, { status: 400 })

  // Preload existing auth users once (email → id), so we don't page per record.
  const emailToId = await loadUserMap(db)

  let created = 0, updated = 0, skipped = 0
  const errors = []

  for (const rec of records) {
    const email = (rec.email || '').toLowerCase().trim()
    if (!email) { skipped++; continue }

    // 1) Find or create a confirmed auth user (no email is sent).
    let userId = emailToId.get(email)
    let isNew = false
    if (!userId) {
      const { data: cr, error: cErr } = await db.auth.admin.createUser({ email, email_confirm: true })
      if (cErr) {
        // Another import/signup beat us to it — re-scan and reuse.
        const fresh = await loadUserMap(db)
        userId = fresh.get(email)
        if (!userId) { skipped++; errors.push({ email, error: cErr.message }); continue }
      } else {
        userId = cr.user.id
        isNew = true
      }
      emailToId.set(email, userId)
    }

    // 2) Upsert the member row keyed on the auth id (the signup trigger may have
    //    created it already; we set the imported fields on top).
    const patch = { id: userId, email, onboarding_email_sent: true, onboarding_sent: true }
    if (rec.full_name != null && String(rec.full_name).trim() !== '') patch.full_name = rec.full_name
    if (rec.plan) patch.plan = rec.plan
    if (rec.joined_at) patch.joined_at = rec.joined_at
    if (rec.subscription_status) patch.subscription_status = rec.subscription_status
    if (rec.notes) patch.notes = rec.notes
    if (typeof rec.newsletter_subscribed === 'boolean') patch.newsletter_subscribed = rec.newsletter_subscribed
    if (typeof rec.print_subscriber === 'boolean') patch.print_subscriber = rec.print_subscriber

    const { error: mErr } = await db.from('members').upsert(patch, { onConflict: 'id' })
    if (mErr) { skipped++; errors.push({ email, error: mErr.message }); continue }
    if (isNew) created++; else updated++
  }

  return Response.json({ created, updated, skipped, errors: errors.slice(0, 20) })
}

// Build an email → auth-user-id map by paging through listUsers (service role).
async function loadUserMap(db) {
  const map = new Map()
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) break
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id)
    if (data.users.length < 1000) break
  }
  return map
}
