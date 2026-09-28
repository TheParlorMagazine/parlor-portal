// Newsletter auto-draft. Runs every Monday at 14:00 UTC; the route itself only
// drafts on odd ISO weeks, alternating with the Bi-weekly Digest (even weeks).
// It pings the CRON_SECRET-gated route, which drafts an issue (if there's new
// content) and notifies admins to review + send.
export const config = { schedule: '0 14 * * 1' }

export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
  try {
    const res = await fetch(`${base}/api/cron/newsletter`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ''}` } })
    const body = await res.text()
    return new Response(body, { status: res.status, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
