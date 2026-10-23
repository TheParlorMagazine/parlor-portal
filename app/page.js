import { getHomeData } from '../lib/homeData'
import HomePageClient from './HomePageClient'

// Static metadata keeps homepage sharing independent of authenticated data.
export const metadata = {
  title: 'The Parlor Magazine',
  description: 'Independent ideas, shared conversations, and a place to belong. Explore The Parlor Magazine.',
  alternates: { canonical: 'https://www.theparlormagazine.com/' },
  openGraph: {
    type: 'website',
    url: 'https://www.theparlormagazine.com/',
    siteName: 'The Parlor Magazine',
    title: 'The Parlor Magazine',
    description: 'Independent ideas, shared conversations, and a place to belong.',
    images: [{ url: '/parlor-social-card.png', width: 1200, height: 630, alt: 'Happy first birthday, The Parlor — an illustrated Victorian birthday tea party beside a pastel pink panel.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Parlor Magazine',
    description: 'Independent ideas, shared conversations, and a place to belong.',
    images: ['/parlor-social-card.png'],
  },
}

// Server-rendered: fetch all homepage data in parallel on the server so the page
// arrives with content in the HTML (no client fetch waterfall). Dynamic because
// articles / announcements / events change.
export const dynamic = 'force-dynamic'

export default async function Page() {
  let initial = {}
  try { initial = await getHomeData() } catch {}
  return <HomePageClient initial={initial} />
}
