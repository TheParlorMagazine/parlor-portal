// Returns null for ordinary forums and for deployments before Film Club exists.
export async function filmClubDiscussion(db, forumId) {
  const { data, error } = await db.from('film_club_screenings')
    .select('commenting_open,discussion_archived,forum:forums!inner(status,join_policy)')
    .eq('forum_id', forumId).maybeSingle()
  if (error && !['42P01', 'PGRST205'].includes(error.code)) throw error
  return data
}

export function filmClubDiscussionVisible(discussion) {
  return !discussion.discussion_archived && discussion.forum.status === 'active'
}
