import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import ArticleShareCard from '../app/_components/ArticleShareCard'

// Only fetch known public image hosts used by the magazine. Missing or failed
// artwork falls back to a text card rather than breaking the sharing preview.
async function loadCover(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    const allowed = ['res.cloudinary.com', 'static.wixstatic.com', 'www.theparlormagazine.com', 'nxpwcdtduxsorbzoajbm.supabase.co']
    if (url.protocol !== 'https:' || !allowed.includes(url.hostname)) return null
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' })
    const type = (response.headers.get('content-type') || '').split(';')[0]
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return null
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > 8 * 1024 * 1024) return null
    return `data:${type};base64,${Buffer.from(buffer).toString('base64')}`
  } catch { return null }
}

export async function renderArticleShareImage(article, isPrivate = false) {
  const cover = await loadCover(article.cover_image_url)
  const author = article.writers?.name || article.author_name
  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), 'assets/fonts/LiberationSerif-Regular.ttf')),
    readFile(path.join(process.cwd(), 'assets/fonts/LiberationSerif-Bold.ttf')),
  ])
  return new ImageResponse(<ArticleShareCard article={{ ...article, author_name: author }} cover={cover} />, {
    width: 1200, height: 630,
    fonts: [{ name: 'ParlorSerif', data: regular, weight: 400 }, { name: 'ParlorSerif', data: bold, weight: 700 }],
    headers: { 'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=300, s-maxage=3600' },
  })
}
