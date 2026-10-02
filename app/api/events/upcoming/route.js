import { serviceClient } from '../../../../lib/apiAuth'

// GET → events for the homepage "Featured events" section: those toggled
// "Feature on homepage" (soonest first, up to 3). If none are toggled, falls
// back to the soonest upcoming published events so the section isn't empty.
export async function GET() {
  const db = serviceClient()
  const nowISO = new Date().toISOString()
  const baseCols = 'id, title, blurb, cover_image_url, location_type, location, starts_at, host_name'
  let { data, error } = await db.from('events')
    .select(`${baseCols}, featured_home`)
    .eq('status', 'published')
    .gte('starts_at', nowISO)
    .order('starts_at', { ascending: true })
    .limit(24)
  if (error) { // featured_home column not migrated yet — fall back
    const r = await db.from('events')
      .select(baseCols)
      .eq('status', 'published').gte('starts_at', nowISO).order('starts_at', { ascending: true }).limit(24)
    data = r.data; error = r.error
  }
  if (error) return Response.json({ events: [] })
  const rows = data || []
  const featured = rows.filter(e => e.featured_home)
  const list = featured.length ? featured : rows
  return Response.json({ events: list.slice(0, 3) })
}
