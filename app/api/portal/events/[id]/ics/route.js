import { serviceClient } from '../../../../../../lib/apiAuth'

// GET → an .ics calendar file for a published event. Public (calendar apps can't
// send auth headers); exposes only the title/time/location of a public event.
function icsDate(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
function esc(s) { return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n') }

export async function GET(request, { params }) {
  const db = serviceClient()
  const { id } = await params
  const { data: e } = await db.from('events').select('*').eq('id', id).single()
  if (!e || e.status !== 'published') return new Response('Not found', { status: 404 })

  const start = e.starts_at ? icsDate(e.starts_at) : ''
  const end = e.ends_at ? icsDate(e.ends_at) : start
  const loc = e.location_type === 'in_person' ? (e.location || '') : (e.join_url || e.location || 'Online')
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Parlor//Events//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@theparlormagazine.com`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    start ? `DTSTART:${start}` : '',
    end ? `DTEND:${end}` : '',
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.blurb || e.description || '')}`,
    loc ? `LOCATION:${esc(loc)}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean)

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(e.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics"`,
    },
  })
}
