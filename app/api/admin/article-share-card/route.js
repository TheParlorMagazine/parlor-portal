import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { renderArticleShareImage } from '../../../../lib/articleShareImage'

export const runtime = 'nodejs'

// Draft previews require staff authentication and must never be cached publicly.
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const db = serviceClient()
  const member = await memberOf(db, user.id)
  if (!['admin', 'editor'].includes(member?.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  if (!body.article_id) return Response.json({ error: 'article_id required' }, { status: 400 })
  const { data: article, error } = await db.from('articles')
    .select('title, subtitle, category, author_name, cover_image_url, writers(name)')
    .eq('id', body.article_id).single()
  if (error || !article) return Response.json({ error: 'Article not found' }, { status: 404 })
  return renderArticleShareImage(article, true)
}
