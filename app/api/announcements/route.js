import { serviceClient } from '../../../lib/apiAuth'

// GET → active announcements for the public site ribbon (rotation order).
// Filters out inactive ones and any outside their optional schedule window.
export async function GET() {
  const db = serviceClient()
  const nowISO = new Date().toISOString()
  const cols = 'id, kicker, headline, message, cta_label, cta_href, type, starts_at, ends_at, sort'
  // Only ribbon-placement announcements (homepage-banner ones live in /homepage).
  let { data, error } = await db.from('announcements')
    .select(`${cols}, placement`).eq('active', true)
    .order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) { // placement column not migrated yet — fall back to all active
    const r = await db.from('announcements').select(cols).eq('active', true)
      .order('sort', { ascending: true }).order('created_at', { ascending: false })
    data = r.data; error = r.error
  }
  if (error) return Response.json({ announcements: [] })
  const live = (data || []).filter(a =>
    (a.placement || 'ribbon') !== 'homepage' &&
    (!a.starts_at || a.starts_at <= nowISO) && (!a.ends_at || a.ends_at >= nowISO)
  )
  return Response.json({ announcements: live })
}
