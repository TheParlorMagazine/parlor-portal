import { requireUser, serviceClient } from '../../../../../lib/apiAuth'

export async function GET(request) {
  if (!(await requireUser(request))) return Response.json({ error: 'Sign in' }, { status: 401 })
  const { data, error } = await serviceClient().from('film_club_screenings')
    .select('event_id,trailer_url,ticket_url,event:events!inner(title,description,blurb,starts_at,ends_at)')
    .eq('event.status', 'published').eq('event.is_public', true)
  if (error && !['42P01', 'PGRST205'].includes(error.code)) {
    return Response.json({ error: 'Could not load screenings.' }, { status: 500 })
  }
  return Response.json({ screenings: data || [] })
}
