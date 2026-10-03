import { getHomeData } from '../lib/homeData'
import HomePageClient from './HomePageClient'

// Server-rendered: fetch all homepage data in parallel on the server so the page
// arrives with content in the HTML (no client fetch waterfall). Dynamic because
// articles / announcements / events change.
export const dynamic = 'force-dynamic'

export default async function Page() {
  let initial = {}
  try { initial = await getHomeData() } catch {}
  return <HomePageClient initial={initial} />
}
