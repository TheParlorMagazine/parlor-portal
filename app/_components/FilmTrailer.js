import { toEmbedUrl } from '../../lib/videoEmbed'
import styles from './FilmTrailer.module.css'

export function getTrailerEmbed(url) {
  if (!url) return null
  try {
    if (new URL(url).protocol !== 'https:') return null
    return toEmbedUrl(url)
  } catch {
    return null
  }
}

export default function FilmTrailer({ src, title, placeholder = 'Trailer coming soon.' }) {
  return src ? (
    <iframe
      className={styles.frame}
      src={src}
      title={`${title} trailer`}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="encrypted-media; picture-in-picture"
      allowFullScreen
    />
  ) : <div className={styles.placeholder}>{placeholder}</div>
}
