import ShopClient from './ShopClient'

export const metadata = {
  title: 'The Parlor Shop',
  description: 'Explore The Parlor Shop: independent print, thoughtful gifts, coffee, and curated finds.',
  alternates: { canonical: 'https://www.theparlormagazine.com/shop' },
  openGraph: {
    type: 'website',
    url: 'https://www.theparlormagazine.com/shop',
    siteName: 'The Parlor Magazine',
    title: 'The Parlor Shop',
    description: 'Independent print, thoughtful gifts, coffee, and curated finds. Discover your next favorite.',
    images: [{ url: '/shop/share-image', width: 1200, height: 630, alt: 'A selection of products from The Parlor Shop.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Parlor Shop',
    description: 'Independent print, thoughtful gifts, coffee, and curated finds.',
    images: ['/shop/share-image'],
  },
}

export default function ShopPage() { return <ShopClient /> }
