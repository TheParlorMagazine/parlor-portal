export const REPUBLICATION_DEFAULTS = {
  is_republished: false,
  original_publication_name: '', original_publication_logo_url: '',
  original_publication_url: '', original_article_url: '',
  original_publication_date: '', republication_license: '', republication_license_url: '',
}
export function publicationUrl(value) {
  if (!value || typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
const authorText = value => typeof value === 'string' ? value.trim() : ''
export function cleanRepublicationAuthors(authors) {
  return Array.isArray(authors) ? authors.filter(a => a && typeof a === 'object' && !Array.isArray(a)).map(a => ({
    name: authorText(a.name), bio: authorText(a.bio),
    photo_url: authorText(a.photo_url), profile_url: authorText(a.profile_url),
  })) : []
}
export function republicationAuthors(article) {
  const authors = cleanRepublicationAuthors(article?.republication_authors)
  if (authors.length) return authors
  if (!article?.author_name?.trim()) return []
  // Do not guess splits in existing names (commas may be part of one name).
  return [{ name: article.author_name.trim(), bio: authorText(article.author_bio),
    photo_url: authorText(article.author_photo_url), profile_url: authorText(article.author_profile_url) }]
}
export function republicationAuthorNames(authors) {
  const names = cleanRepublicationAuthors(authors).map(a => a.name).filter(Boolean)
  if (names.length < 2) return names[0] || ''
  return names[0] + ' & ' + names[1] + (names.length > 2 ? ', ' + names.slice(2).join(', ') : '')
}
// Keep the existing scalar snapshot in sync for cards, search and old API clients.
// External authors never acquire Parlor writer records or an author_id.
export function republicationPayload(form) {
  const hasAuthors = Array.isArray(form.republication_authors)
  const authors = hasAuthors ? (form.is_republished ? republicationAuthors(form) : cleanRepublicationAuthors(form.republication_authors)) : null
  const authorMetadata = hasAuthors ? { republication_authors: authors } : {}
  if (!form.is_republished && !form._hasRepublicationFields && !Object.keys(REPUBLICATION_DEFAULTS).some(k => k !== 'is_republished' && form[k]?.trim())) return authorMetadata
  const metadata = {
    is_republished: !!form.is_republished, ...authorMetadata,
    ...Object.fromEntries(Object.keys(REPUBLICATION_DEFAULTS).filter(k => k !== 'is_republished').map(k => [k, form[k]?.trim() || null])),
  }
  if (!form.is_republished) return metadata
  const primary = authors?.[0]
  return { ...metadata, author_id: null,
    author_name: authors?.length ? republicationAuthorNames(authors) || null : form.author_name?.trim() || null,
    author_photo_url: primary?.photo_url || null, author_profile_url: primary?.profile_url || null,
    author_bio: primary?.bio || null }
}
export function articleAuthorName(article) {
  return article?.is_republished ? republicationAuthorNames(republicationAuthors(article)) : article?.writers?.name || article?.author_name || 'The Parlor Editors'
}
export function republicationError(form) {
  if (!form.is_republished) return null
  const authors = republicationAuthors(form)
  if (!authors.length || authors.some(a => !a.name)) return 'Enter every original author’s name before publishing.'
  for (const author of authors) {
    if ((author.photo_url && !publicationUrl(author.photo_url)) || (author.profile_url && !publicationUrl(author.profile_url))) return 'Author photos and profile links must be full http:// or https:// URLs.'
  }
  if (!form.original_publication_name?.trim()) return 'Enter the original publication’s name before publishing.'
  for (const key of ['original_publication_logo_url','original_publication_url','original_article_url','republication_license_url']) {
    if (form[key] && !publicationUrl(form[key])) return 'Publication, logo, original article and license links must be full http:// or https:// URLs.'
  }
  return null
}
