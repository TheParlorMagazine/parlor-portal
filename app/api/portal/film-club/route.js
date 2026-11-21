import { requireUser, serviceClient } from '../../../../lib/apiAuth'

export async function GET(request) {
  if (!(await requireUser(request))) return Response.json({ error: 'Sign in' }, { status: 401 })
  const { data, error } = await serviceClient().from('film_club_screenings')
    .select('forum_id,discussion_active,commenting_open,event:events!inner(title,starts_at),forum:forums!inner(status,thread_count)')
    .eq('discussion_archived', false).eq('forum.status', 'active')
  if (error) {
    if (['42P01', 'PGRST205'].includes(error.code)) return Response.json({ discussions: [] })
    return Response.json({ error: 'Could not load Film Club discussions.' }, { status: 500 })
  }
  return Response.json({ discussions: data })
}
