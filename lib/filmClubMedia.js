import { toEmbedUrl } from './videoEmbed'

export const FILM_MEDIA_MAX_BYTES = 4 * 1024 * 1024
export function filmImageUrl(value) {
  if (!value || typeof value !== 'string') return null
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
export function isFilmVideoFile(value) {
  try { return Boolean(filmImageUrl(value)) && /\.(mp4|webm)$/i.test(new URL(value).pathname) } catch { return false }
}
export function filmTrailerSource(value) {
  if (!filmImageUrl(value)) return null
  return isFilmVideoFile(value) ? value : toEmbedUrl(value)
}
export function filmUploadError(file, kind) {
  const allowed = kind === 'cover' ? ['image/jpeg','image/png','image/webp','image/gif'] : ['video/mp4','video/webm']
  if (!allowed.includes(file?.type)) return kind === 'cover' ? 'Choose a JPG, PNG, WebP or GIF cover image.' : 'Choose an MP4 or WebM video snippet.'
  if (!file.size || file.size > FILM_MEDIA_MAX_BYTES) return 'Choose a file up to 4 MB. For larger trailers, use a YouTube or Vimeo link.'
  return null
}
