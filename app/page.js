import { getHomeData } from '../lib/homeData'
import HomePageClient from './HomePageClient'

// Static metadata keeps homepage sharing independent of authenticated data.
export const metadata = {
  title: 'The Parlor Magazine',
  description: 'Independent ideas, shared conversations, and a place to belong. Explore The Parlor Magazine.',
  alternates: { canonical: 'https://theparlormagazine.com/' },
  openGraph: {
    type: 'website',
    url: 'https://theparlormagazine.com/',
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

// Give crawlers an explicit homepage image without changing article thumbnails.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://theparlormagazine.com/#organization',
      name: 'The Parlor Magazine',
      url: 'https://theparlormagazine.com/',
      logo: 'https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://theparlormagazine.com/#website',
      name: 'The Parlor Magazine',
      url: 'https://theparlormagazine.com/',
      publisher: { '@id': 'https://theparlormagazine.com/#organization' },
    },
    {
      '@type': 'ImageObject',
      '@id': 'https://theparlormagazine.com/#homepage-image',
      url: 'https://theparlormagazine.com/parlor-social-card.png',
      contentUrl: 'https://theparlormagazine.com/parlor-social-card.png',
      width: 1200,
      height: 630,
      caption: 'Happy first birthday, The Parlor — an illustrated Victorian birthday tea party beside a pastel pink panel.',
    },
    {
      '@type': 'WebPage',
      '@id': 'https://theparlormagazine.com/#webpage',
      url: 'https://theparlormagazine.com/',
      name: 'The Parlor Magazine',
      description: metadata.description,
      isPartOf: { '@id': 'https://theparlormagazine.com/#website' },
      about: { '@id': 'https://theparlormagazine.com/#organization' },
      primaryImageOfPage: { '@id': 'https://theparlormagazine.com/#homepage-image' },
      image: { '@id': 'https://theparlormagazine.com/#homepage-image' },
    },
  ],
}

// Server-rendered: fetch all homepage data in parallel on the server so the page
// arrives with content in the HTML (no client fetch waterfall). Dynamic because
// articles / announcements / events change.
export const dynamic = 'force-dynamic'

export default async function Page() {
  let initial = {}
  try { initial = await getHomeData() } catch {}
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <HomePageClient initial={initial} />
  </>
}
