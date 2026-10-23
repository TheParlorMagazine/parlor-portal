import { createClient } from '../../../../lib/supabase'
import { renderArticleShareImage } from '../../../../lib/articleShareImage'

export const runtime = 'nodejs'

export async function GET(request, { params }) {
  const { slug } = await params
  const { data: article, error } = await createClient().from('articles')
    .select('title, subtitle, category, author_name, cover_image_url, writers(name)')
    .eq('slug', slug).eq('published', true).single()
  if (error || !article) return new Response('Article not found', { status: 404 })
  return renderArticleShareImage(article)
}
