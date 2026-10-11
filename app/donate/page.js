import { createClient } from '@supabase/supabase-js'
import DonateClient from './DonateClient'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

async function getGifts() {
  const supabase = admin()

  const [{ data: items }, { data: claims }, { data: banners }] = await Promise.all([
    supabase.from('gift_items').select('*').order('display_order'),
    supabase.from('gift_claims').select('gift_slug'),
    supabase.from('announcements').select('image_url').eq('active', true).eq('placement', 'homepage').order('sort').limit(1),
  ])

  const bannerImage = banners?.[0]?.image_url || null

  const claimCounts = {}
  for (const c of claims || []) {
    claimCounts[c.gift_slug] = (claimCounts[c.gift_slug] || 0) + 1
  }

  return {
    gifts: (items || []).map(item => ({
      ...item,
      claimed: claimCounts[item.slug] || 0,
      remaining: item.capacity !== null ? item.capacity - (claimCounts[item.slug] || 0) : null,
    })),
    bannerImage,
  }
}

export default async function DonatePage() {
  const { gifts, bannerImage } = await getGifts()
  return <DonateClient gifts={gifts} bannerImage={bannerImage} />
}
