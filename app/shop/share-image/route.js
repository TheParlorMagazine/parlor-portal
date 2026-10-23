import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { serviceClient } from '../../../lib/apiAuth'
import { loadShareImage } from '../../../lib/shareImageAssets'
import { selectBonesProducts } from '../../../lib/bonesProducts'

export const runtime = 'nodejs'

export async function GET() {
  let products = []
  let unavailable = false
  try {
    const { data, error } = await serviceClient().from('shop_products')
      .select('id, name, variant, description, images, featured, external_url')
      .eq('active', true).order('sort', { ascending: true }).order('created_at', { ascending: false })
    if (error) throw error
    const catalogue = data || []
    const candidates = [...catalogue.filter(p => p.featured), ...selectBonesProducts(catalogue), ...catalogue]
    const seen = new Set()
    products = candidates.filter(p => {
      if (seen.has(p.id) || !p.images?.[0]) return false
      seen.add(p.id); return true
    }).slice(0, 6)
  } catch { unavailable = true }
  const cards = await Promise.all(products.map(async p => ({ ...p, name: p.name || 'Shop find', image: await loadShareImage(p.images[0]) })))
  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), 'assets/fonts/LiberationSerif-Regular.ttf')),
    readFile(path.join(process.cwd(), 'assets/fonts/LiberationSerif-Bold.ttf')),
  ])
  return new ImageResponse(<div style={{ width: 1200, height: 630, background: '#fff8f4', display: 'flex', fontFamily: 'ParlorSerif', color: '#23171c' }}>
    <div style={{ width: 370, padding: '50px 36px', background: '#f2b8c6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', fontSize: 29, fontWeight: 700 }}>The Parlor</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, lineHeight: 1.05 }}>A little something for you.</div>
        <div style={{ display: 'flex', fontSize: 24, lineHeight: 1.4, marginTop: 24 }}>Print, gifts, coffee, and curated finds.</div>
      </div>
      <div style={{ display: 'flex', fontSize: 18 }}>theparlormagazine.com/shop</div>
    </div>
    <div style={{ width: 830, padding: '26px 28px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 27, fontWeight: 700, marginBottom: 18 }}>From The Parlor Shop</div>
      {cards.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>{cards.map(p => <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 248, height: 248, padding: 12, background: '#fff', border: '1px solid #ead3db', borderRadius: 10 }}>
        {p.image ? <img src={p.image} width={220} height={174} style={{ objectFit: 'contain' }} /> : <div style={{ width: 220, height: 174, background: '#fbedf1', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 22 }}>The Parlor Shop</div>}
        <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontSize: 17, lineHeight: 1.15, marginTop: 9 }}>{p.name.length > 62 ? `${p.name.slice(0, 59)}…` : p.name}</div>
      </div>)}</div> : <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontSize: 55, color: '#7a2531' }}>The Parlor Shop</div>}
    </div>
  </div>, {
    width: 1200, height: 630,
    fonts: [{ name: 'ParlorSerif', data: regular, weight: 400 }, { name: 'ParlorSerif', data: bold, weight: 700 }],
    headers: { 'Cache-Control': unavailable ? 'public, max-age=60' : 'public, max-age=300, s-maxage=3600' },
  })
}
