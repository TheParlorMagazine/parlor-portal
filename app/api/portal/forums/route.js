import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

// GET → { forums: [...] }  — active forums the member can see
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)

  const [{ data: forumsData }, { data: myMemberships }] = await Promise.all([
    db.from('forums')
      .select('id, slug, name, description, member_count, thread_count, avatar_url, cover_image_url')
      .eq('status', 'active')
      .order('member_count', { ascending: false })
      .limit(10),
    me ? db.from('forum_members').select('forum_id').eq('member_id', me.id) : Promise.resolve({ data: [] }),
  ])

  const joinedIds = new Set((myMemberships || []).map(m => m.forum_id))

  // Get recent thread count (last 7 days) per forum
  const forumIds = (forumsData || []).map(f => f.id)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentThreads } = forumIds.length
    ? await db.from('forum_threads')
        .select('forum_id')
        .in('forum_id', forumIds)
        .eq('status', 'live')
        .gte('created_at', since)
    : { data: [] }

  const recentCounts = {}
  for (const t of recentThreads || []) recentCounts[t.forum_id] = (recentCounts[t.forum_id] || 0) + 1

  const forums = (forumsData || []).map(f => ({
    ...f,
    joined: joinedIds.has(f.id),
    new_posts: recentCounts[f.id] || 0,
  }))

  return Response.json({ forums })
}
