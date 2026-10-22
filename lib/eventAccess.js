// Server-only; the database is authoritative for visibility, roles and capacity.
export async function eventSummary(db, eventId, memberId) {
  const { data, error } = await db.rpc('event_summary', { p_event: eventId, p_member: memberId })
  if (error) throw error
  return data
}
export function eventError(error) {
  return Response.json({ error: error.code === '42501' ? 'Event not available' : ['22023','P0001'].includes(error.code) ? error.message : 'Could not update event. Please try again.' }, { status: error.code === '42501' ? 403 : ['22023','P0001'].includes(error.code) ? 400 : 500 })
}
