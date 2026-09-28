// Netlify Scheduled Function — checks for due scheduled broadcasts every 15 min.
export const config = { schedule: '*/15 * * * *' }

export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
  try {
    const res = await fetch(`${base}/api/cron/broadcasts`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ''}` } })
    const body = await res.text()
    return new Response(body, { status: res.status, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
