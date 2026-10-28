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
// Republished authors have no Parlor writer association; author_name is their
// explicit byline. Do not silently create an editorial fallback for these pieces.
export function republicationPayload(form) {
  // Legacy ordinary articles must remain saveable before the additive migration.
  if (!form.is_republished && !form._hasRepublicationFields && !Object.keys(REPUBLICATION_DEFAULTS).some(k => k !== 'is_republished' && form[k]?.trim())) return {}
  const metadata = {
    is_republished: !!form.is_republished,
    ...Object.fromEntries(Object.keys(REPUBLICATION_DEFAULTS).filter(k => k !== 'is_republished').map(k => [k, form[k]?.trim() || null])),
  }
  if (!form.is_republished) return metadata
  return { ...metadata, author_id: null, author_name: form.author_name?.trim() || null,
    author_photo_url: null, author_profile_url: null, author_bio: null }
}
export function articleAuthorName(article) {
  return article?.is_republished ? article.author_name?.trim() || '' : article?.writers?.name || article?.author_name || 'The Parlor Editors'
}
export function republicationError(form) {
  if (!form.is_republished) return null
  if (!form.author_name?.trim()) return 'Enter the original author’s name before publishing.'
  if (!form.original_publication_name?.trim()) return 'Enter the original publication’s name before publishing.'
  for (const key of ['original_publication_logo_url','original_publication_url','original_article_url','republication_license_url']) {
    if (form[key] && !publicationUrl(form[key])) return 'Publication, logo, original article and license links must be full http:// or https:// URLs.'
  }
  return null
}
