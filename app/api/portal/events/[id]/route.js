import { filmClubDiscussion, filmClubDiscussionVisible } from '../../../../../lib/filmClubDiscussions'
import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { eventSummary, eventError } from '../../../../../lib/eventAccess'
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  try {
    const db = serviceClient()
    const { id } = await params
    const result = await eventSummary(db, id, user.id)
    const forumId = result.event?.forum_id
    const discussion = forumId ? await filmClubDiscussion(db, forumId) : null
    if (!discussion) {
      const { data: screening, error } = await db.from('film_club_screenings').select('event_id').eq('event_id', id).maybeSingle()
      if (error && !['42P01', 'PGRST205'].includes(error.code)) throw error
      return Response.json(screening ? { ...result, film_club_discussion: false } : result)
    }
    return Response.json({
      ...result,
      film_club_discussion: filmClubDiscussionVisible(discussion) &&
        (result.can_access_forum || discussion.forum.join_policy === 'open'),
    })
  }
  catch (error) { return eventError(error) }
}
