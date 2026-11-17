import { serviceClient } from './apiAuth'

export const missionArticleSlugs = [
  ['the-battle-for-the-southwest', 'occupied-minnesota-inside-the-resistance-to-operation-metro-surge'],
  ['following-the-foodways', 'layers-of-paint-and-purpose'],
  ['holding-space-lib-lula-books-co', 'somalisota'],
  ['who-gets-to-save-the-planet', 'growing-something-that-lasts'],
]

// Fetch only the eight selected public articles, preserving the owner's order.
// A failed lookup leaves the Mission text usable; it never invents cover images.
export async function getMissionArticles(db) {
  try {
    const { data, error } = await (db || serviceClient()).from('articles')
      .select('slug, title, cover_image_url').in('slug', missionArticleSlugs.flat())
      .eq('published', true).lte('date_published', new Date().toISOString())
      .abortSignal(AbortSignal.timeout(3000))
    if (error) return missionArticleSlugs.map(() => [])
    const articles = new Map((data || []).map(article => [article.slug, article]))
    return missionArticleSlugs.map(slugs => slugs.flatMap(slug => {
      const article = articles.get(slug)
      if (!article?.title) return []
      return [{ slug, title: article.title, href: `/post/${encodeURIComponent(slug)}`, image: /^https?:\/\//i.test(article.cover_image_url || '') ? article.cover_image_url : null }]
    }))
  } catch { return missionArticleSlugs.map(() => []) }
}
