// Netlify Scheduled Function — prunes old read notifications daily at 03:00 UTC.
export const config = { schedule: '0 3 * * *' }

export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
  try {
    const res = await fetch(`${base}/api/cron/prune-notifications`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ''}` } })
    const body = await res.text()
    return new Response(body, { status: res.status, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
