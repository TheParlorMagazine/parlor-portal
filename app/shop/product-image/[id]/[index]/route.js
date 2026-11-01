import sharp from 'sharp'
import { serviceClient } from '../../../../../lib/apiAuth'
import { SHOP_PRODUCT_ID, printifyImageSource } from '../../../../../lib/shopProductImages'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const LIMIT = 8 * 1024 * 1024
const fail = (status = 404) => new Response('Product image unavailable.', {
  status, headers: { 'Cache-Control': 'no-store', ...(status === 503 ? { 'Retry-After': '300' } : {}) },
})

export async function GET(_request, { params }) {
  const { id, index } = await params
  if (!SHOP_PRODUCT_ID.test(id) || !/^\d{1,3}$/.test(index)) return fail()
  try {
    const { data, error } = await serviceClient().from('shop_products').select('id, images')
      .eq('id', id).eq('active', true).maybeSingle()
    if (error) return fail(503)
    if (!data || !Array.isArray(data.images)) return fail()
    const source = printifyImageSource(data.images[Number(index)])
    if (!source) return fail()
    // Never follow an upstream redirect to a different/untrusted host.
    const response = await fetch(source, { redirect: 'error', signal: AbortSignal.timeout(10000) })
    const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return fail(503)
    if (Number(response.headers.get('content-length')) > LIMIT) { await response.body?.cancel(); return fail(503) }
    if (!response.body) return fail(503)
    const reader = response.body.getReader(), chunks = []
    let bytes = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > LIMIT) { await reader.cancel(); return fail(503) }
      chunks.push(Buffer.from(value))
    }
    // Validate and normalize the actual image; don't return HTML or a fabricated
    // placeholder to Google if the provider cannot supply the product artwork.
    const image = await sharp(Buffer.concat(chunks), { limitInputPixels: 40000000 })
      .rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer()
    return new Response(image, { headers: {
      'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch { return fail(503) }
}
