import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { hasPaidAccess } from '../../../../lib/plans'

// GET → the book club shelf. Book metadata is visible to every member (a teaser
// for free members); the discussions themselves are paid-only (see [id] route).
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  const paid = hasPaidAccess(me)

  const { data, error } = await db.from('book_club')
    .select('id, title, author, cover_image_url, book_url, blurb, status, meeting_at, sort, created_at')
    .order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rank = { current: 0, upcoming: 1, past: 2 }
  const books = (data || []).sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3))
  return Response.json({ paid, books })
}
