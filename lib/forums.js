// Forum membership + access helpers. Pass a service-role Supabase client.

// The caller's role in a forum ('host' | 'member'), or null if not a member.
export async function forumRole(db, forumId, memberId) {
  const { data } = await db.from('forum_members').select('role').eq('forum_id', forumId).eq('member_id', memberId).maybeSingle()
  return data?.role || null
}

// Roles that get super-moderator (host-level) access to ANY forum, even without
// being a member — for admin oversight of the whole forum system.
const SUPERMOD_ROLES = ['admin', 'social_admin']

// The caller's effective role in a forum: their membership role, or 'host' if
// they're an admin/community-team super-moderator. null = no access.
export async function effectiveForumRole(db, forumId, memberId) {
  const role = await forumRole(db, forumId, memberId)
  if (role) return role
  const { data: m } = await db.from('members').select('role').eq('id', memberId).maybeSingle()
  return m && SUPERMOD_ROLES.includes(m.role) ? 'host' : null
}

// Fetch a thread's forum id (for gating replies/votes by forum membership).
export async function threadForumId(db, threadId) {
  const { data } = await db.from('forum_threads').select('forum_id, status').eq('id', threadId).maybeSingle()
  return data || null
}

export function excerpt(html, n = 160) {
  const text = (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > n ? text.slice(0, n).trimEnd() + '…' : text
}
