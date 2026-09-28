// Netlify Scheduled Function — runs weekly and triggers the digest API route.
// Schedule: Mondays 14:00 UTC. Adjust the cron below to taste.
export const config = { schedule: '0 14 * * 1' }

export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
  try {
    const res = await fetch(`${base}/api/cron/weekly-digest`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ''}` },
    })
    const body = await res.text()
    return new Response(body, { status: res.status, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
