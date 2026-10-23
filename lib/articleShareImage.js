import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadShareImage } from './shareImageAssets'
import { ImageResponse } from 'next/og'
import ArticleShareCard from '../app/_components/ArticleShareCard'

export async function renderArticleShareImage(article, isPrivate = false) {
  const cover = await loadShareImage(article.cover_image_url)
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
