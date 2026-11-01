import sharp from 'sharp'

// Only fetch known public image hosts used by the magazine. Missing or failed
// artwork falls back to a text card rather than breaking the sharing preview.
export async function loadShareImage(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    const allowed = ['res.cloudinary.com', 'static.wixstatic.com', 'www.theparlormagazine.com', 'nxpwcdtduxsorbzoajbm.supabase.co', 'cdn.shopify.com', 'images.printify.com', 'images-api.printify.com', 'www.bonescoffee.com', 'bonescoffee.com']
    if (url.protocol !== 'https:' || !allowed.includes(url.hostname)) return null
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' })
    const type = (response.headers.get('content-type') || '').split(';')[0]
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return null
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > 8 * 1024 * 1024) return null
    // next/og cannot decode WebP reliably. Normalize all accepted artwork,
    // validating it here so corrupt covers use the existing text fallback.
    const png = await sharp(Buffer.from(buffer), { limitInputPixels: 40000000 })
      .rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch { return null }
}

