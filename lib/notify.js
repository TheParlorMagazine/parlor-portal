// Server-side helpers to create in-app notifications. Call from API routes /
// server actions when a notifiable event happens (a reply, a new library drop,
// an event, an inbox message, etc.). Pass a service-role Supabase client.

export async function notifyMember(db, { memberId, type, message, linkTo = null, linkRef = null }) {
  if (!memberId || !message) return
  await db.from('notifications').insert({
    member_id: memberId, type, message, link_to: linkTo, link_ref: linkRef, read: false,
  })
}

// Notify every admin (e.g. a member sent a new message). `exceptId` omits one.
export async function notifyAdmins(db, { type = 'inbox', message, linkTo = 'inbox', linkRef = null, exceptId = null }) {
  const { data: admins } = await db.from('members').select('id').eq('role', 'admin')
  const rows = (admins || [])
    .filter(a => a.id !== exceptId)
    .map(a => ({ member_id: a.id, type, message, link_to: linkTo, link_ref: linkRef, read: false }))
  if (rows.length) await db.from('notifications').insert(rows)
}

// Broadcast to every active member (e.g. a new library drop or event). Skips
// deactivated members. `exceptId` omits one member (e.g. the author).
export async function notifyAllMembers(db, { type, message, linkTo = null, linkRef = null, exceptId = null }) {
  const { data: members } = await db.from('members').select('id').eq('deactivated', false)
  const rows = (members || [])
    .filter(m => m.id !== exceptId)
    .map(m => ({ member_id: m.id, type, message, link_to: linkTo, link_ref: linkRef, read: false }))
  if (rows.length) {
    for (let i = 0; i < rows.length; i += 500) {
      await db.from('notifications').insert(rows.slice(i, i + 500))
    }
  }
}
