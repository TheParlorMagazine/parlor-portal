import { filmTrailerSource, isFilmVideoFile } from '../../lib/filmClubMedia'
import styles from './FilmTrailer.module.css'

export const getTrailerEmbed = filmTrailerSource

export default function FilmTrailer({ src, title, poster, placeholder = 'Trailer coming soon.' }) {
  if (isFilmVideoFile(src)) return <video className={styles.frame} src={src} poster={poster || undefined}
    controls playsInline preload="metadata" aria-label={`${title} trailer`} />
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
