import { filmClubDiscussion, filmClubDiscussionVisible } from '../../../../../lib/filmClubDiscussions'
import { requireUser, serviceClient } from '../../../../../lib/apiAuth'
import { eventSummary, eventError } from '../../../../../lib/eventAccess'
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  try {
    const db = serviceClient()
    const result = await eventSummary(db, (await params).id, user.id)
    const forumId = result.event?.forum_id
    if (!forumId) return Response.json(result)
    const discussion = await filmClubDiscussion(db, forumId)
    if (!discussion) return Response.json(result)
    return Response.json({
      ...result,
      film_club_discussion: filmClubDiscussionVisible(discussion) &&
        (result.can_access_forum || discussion.forum.join_policy === 'open'),
    })
  }
  catch (error) { return eventError(error) }
}
