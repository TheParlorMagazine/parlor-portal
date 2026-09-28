import crypto from 'crypto'
import { requireUser, serviceClient } from '../../../../../../lib/apiAuth'
import { effectiveForumRole } from '../../../../../../lib/forums'
import { notifyMember } from '../../../../../../lib/notify'
import { sendForumInviteEmail } from '../../../../../../lib/emails'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'

// POST { emails: [...] } → invite people to the forum (moderators only).
// Existing members are added straight away; unknown emails get an emailed invite.
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params
  if (await effectiveForumRole(db, id, user.id) !== 'host') return Response.json({ error: 'Moderators only' }, { status: 403 })

  let b = {}
  try { b = await request.json() } catch {}
  const emails = [...new Set((b.emails || []).map(e => String(e).trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))]
  if (emails.length === 0) return Response.json({ error: 'Enter at least one valid email' }, { status: 400 })

  const { data: forum } = await db.from('forums').select('id, name').eq('id', id).single()
  if (!forum) return Response.json({ error: 'Not found' }, { status: 404 })
  const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
  const inviterName = me?.full_name || 'A Parlor member'

  // Which emails already belong to members?
  const { data: existing } = await db.from('members').select('id, email').in('email', emails)
  const memberByEmail = Object.fromEntries((existing || []).map(m => [(m.email || '').toLowerCase(), m.id]))

  let added = 0, invited = 0, emailed = 0
  const links = []
  for (const email of emails) {
    const memberId = memberByEmail[email]
    if (memberId) {
      // Existing member → add directly (skip if already in).
      const role = await db.from('forum_members').select('member_id').eq('forum_id', id).eq('member_id', memberId).maybeSingle()
      if (!role.data) {
        await db.from('forum_members').insert({ forum_id: id, member_id: memberId, role: 'member' })
        await notifyMember(db, { memberId, type: 'system', message: `${inviterName} added you to ${forum.name}`, linkTo: 'forum', linkRef: id })
        added++
      }
    } else {
      // Unknown → create a redeemable invite + try to email it.
      const token = crypto.randomBytes(18).toString('base64url')
      const { error } = await db.from('forum_invites').insert({ forum_id: id, email, token, invited_by: user.id })
      if (!error) {
        const url = `${SITE}/portal/join/${token}`
        links.push({ email, url })
        invited++
        // resend returns { error } instead of throwing; count only real sends.
        try { const r = await sendForumInviteEmail({ to: email, forumName: forum.name, inviterName, joinUrl: url, siteUrl: SITE }); if (r && !r.error) emailed++ } catch {}
      }
    }
  }
  if (added > 0) {
    const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', id)
    await db.from('forums').update({ member_count: count || 0 }).eq('id', id)
  }
  return Response.json({ ok: true, added, invited, emailed, links })
}
