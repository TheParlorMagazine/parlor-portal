import { cache } from 'react'
import { serviceClient } from './apiAuth'

export function publicImage(value) { return /^https?:\/\//i.test(value || '') ? value : null }

// Select public profile fields explicitly; never send writer account/contact fields to the browser.
export async function fetchContributingWriters(db = serviceClient()) {
  const writers = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await db.from('writers').select('id, name, slug, photo_url, bio')
      .order('name').order('id').range(start, start + 499).abortSignal(AbortSignal.timeout(5000))
    if (error) throw error
    writers.push(...(data || []).filter(w => w.name?.trim() && w.slug))
    if ((data || []).length < 500) break
  }
  return writers.map(w => ({ ...w, photo_url: publicImage(w.photo_url) }))
}
export const getContributingWriters = cache(() => fetchContributingWriters())

export async function getWriterArticles(id, db = serviceClient()) {
  const articles = []
  const now = new Date().toISOString()
  for (let start = 0; ; start += 500) {
    const { data, error } = await db.from('articles').select('slug, title, cover_image_url, date_published')
      .eq('author_id', id).eq('published', true).lte('date_published', now)
      .order('date_published', { ascending: false }).order('id').range(start, start + 499)
      .abortSignal(AbortSignal.timeout(5000))
    if (error) throw error
    articles.push(...(data || []).filter(a => a.slug && a.title).map(a => ({ ...a, cover_image_url: publicImage(a.cover_image_url) })))
    if ((data || []).length < 500) break
  }
  return articles
}
