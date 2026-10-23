import { createClient } from '@supabase/supabase-js'
import DonateClient from '../donate/DonateClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Buy us a birthday gift — The Parlor',
  description: 'Celebrate The Parlor’s first birthday. Help keep independent ideas, shared conversations, and our next print run alive with a birthday gift.',
  alternates: { canonical: 'https://www.theparlormagazine.com/buy-us-a-birthday-gift' },
  openGraph: {
    type: 'website',
    url: 'https://www.theparlormagazine.com/buy-us-a-birthday-gift',
    siteName: 'The Parlor Magazine',
    title: 'Buy us a birthday gift — The Parlor',
    description: 'The Parlor turns one. From a cup of coffee to the next print run, your birthday gift helps keep us going.',
    images: [{ url: '/birthday-gift-social.png', width: 1200, height: 630, alt: 'Give The Parlor a birthday gift — illustrated friends gathered around a birthday cake.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy us a birthday gift — The Parlor',
    description: 'The Parlor turns one. Your birthday gift helps keep independent publishing alive.',
    images: ['/birthday-gift-social.png'],
  },
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

async function getGifts() {
  const supabase = admin()

  const [{ data: items }, { data: claims }] = await Promise.all([
    supabase.from('gift_items').select('*').order('display_order'),
    supabase.from('gift_claims').select('gift_slug'),
  ])

  const claimCounts = {}
  for (const c of claims || []) {
    claimCounts[c.gift_slug] = (claimCounts[c.gift_slug] || 0) + 1
  }

  return (items || []).map(item => ({
    ...item,
    claimed: claimCounts[item.slug] || 0,
    remaining: item.capacity !== null ? item.capacity - (claimCounts[item.slug] || 0) : null,
  }))
}

export default async function DonatePage() {
  const gifts = await getGifts()
  return <DonateClient gifts={gifts} />
}
