import { requireUser, serviceClient } from '../../../../../lib/apiAuth'

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const { data, error } = await db.from('film_club_screenings')
    .select('event_id,trailer_url,ticket_url,event:events!inner(title,description,blurb,starts_at,ends_at,cover_image_url)')
    .eq('event.status', 'published').eq('event.is_public', true)
  if (error && !['42P01', 'PGRST205'].includes(error.code)) {
    return Response.json({ error: 'Could not load screenings.' }, { status: 500 })
  }
  if (!data?.length) return Response.json({ screenings: [] })
  const { data: paid, error: membershipError } = await db.rpc('film_club_paid_member', { p_member: user.id })
  if (membershipError) return Response.json({ error: 'Could not check membership.' }, { status: 500 })
  return Response.json({ screenings: data.map(screening => paid ? { ...screening, ticket_url: null } : screening) })
}
