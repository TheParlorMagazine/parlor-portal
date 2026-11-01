import sharp from 'sharp'
import { emailImageSource } from '../../../../lib/emailImages'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30
const LIMIT = 8 * 1024 * 1024
const fail = (status) => new Response('Email image unavailable.', { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
export async function GET(_request, { params }) {
  const { background, source: segments } = await params
  const source = Array.isArray(segments) ? emailImageSource('https://' + segments.map(encodeURIComponent).join('/')) : null
  if (!source || !['ffffff', 'fdf0f3'].includes(background)) return fail(400)
  try {
    const response = await fetch(source, { redirect: 'error', signal: AbortSignal.timeout(10000), cache: 'no-store' })
    if (!response.ok || !/^image\/(png|webp|jpeg|avif|gif)(?:;|$)/i.test(response.headers.get('content-type') || '')) return fail(502)
    if (Number(response.headers.get('content-length')) > LIMIT) { await response.body?.cancel(); return fail(413) }
    if (!response.body) return fail(502)
    const reader = response.body.getReader(), chunks = []
    let bytes = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > LIMIT) { await reader.cancel(); return fail(413) }
      chunks.push(Buffer.from(value))
    }
    const input = Buffer.concat(chunks)
    const metadata = await sharp(input, { limitInputPixels: 40000000 }).metadata()
    // Animated uploads retain their animation; do not silently turn a GIF into
    // a still image. They are outside the static-artwork flattening fix.
    if ((metadata.pages || 1) > 1) return new Response(input, { headers: { 'Content-Type': response.headers.get('content-type'), 'Cache-Control': 'public, max-age=3600, s-maxage=86400', 'X-Content-Type-Options': 'nosniff' } })
    const image = await sharp(input, { limitInputPixels: 40000000 }).rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#' + background }).jpeg({ quality: 92 }).toBuffer()
    return new Response(image, { headers: {
      'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400', 'X-Content-Type-Options': 'nosniff',
    } })
  } catch { return fail(502) }
}
