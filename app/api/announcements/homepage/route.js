import { serviceClient } from '../../../../lib/apiAuth'

// GET → active homepage-banner announcements (eyebrow + header + description +
// hero image), soonest sort first, within any schedule window.
export async function GET() {
  const db = serviceClient()
  const nowISO = new Date().toISOString()
  const { data, error } = await db.from('announcements')
    .select('id, kicker, headline, message, cta_label, cta_href, image_url, type, starts_at, ends_at, sort')
    .eq('active', true).eq('placement', 'homepage')
    .order('sort', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ banners: [] }) // columns not migrated yet
  const live = (data || []).filter(a =>
    (!a.starts_at || a.starts_at <= nowISO) && (!a.ends_at || a.ends_at >= nowISO)
  )
  return Response.json({ banners: live })
}
