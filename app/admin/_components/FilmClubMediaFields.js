'use client'

import { useId, useState } from 'react'
import FilmTrailer, { getTrailerEmbed } from '../../_components/FilmTrailer'
import { uploadToCloudinary } from '../../../lib/uploadImage'
import { filmUploadError } from '../../../lib/filmClubMedia'
import styles from './FilmClubAdmin.module.css'

export default function FilmClubMediaFields({ cover, trailer, onCover, onTrailer, disabled, onUploading }) {
  const id = useId()
  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  async function upload(event, kind) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const error = filmUploadError(file, kind)
    if (error) { setError(error); return }
    setError(''); setUploading(kind); onUploading?.(true)
    try {
      const url = await uploadToCloudinary(file, 'parlor/film-club')
      if (kind === 'cover') onCover(url)
      else { onTrailer(url); setPreview(true) }
    } catch { setError('Upload failed. Please try again.') }
    finally { setUploading(''); onUploading?.(false) }
  }
  return <fieldset className={styles.mediaFields} disabled={disabled || !!uploading}>
    <legend>Screening images and trailer</legend>
    <label>Cover image URL<input name="cover_image_url" type="url" value={cover} onChange={e => onCover(e.target.value)} placeholder="https://" /></label>
    <label htmlFor={`${id}-cover`}>Upload cover image</label>
    <input id={`${id}-cover`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => upload(e, 'cover')} />
    <p>This cover appears on the Film Club main page and screening details. JPG, PNG, WebP or GIF, up to 4 MB.</p>
    {cover && <img className={styles.coverPreview} src={cover} alt="Screening cover preview" />}
    <label>Trailer URL<input name="trailer_url" type="url" value={trailer} onChange={e => { onTrailer(e.target.value); setPreview(false) }} placeholder="YouTube, Vimeo, or a direct MP4/WebM link" /></label>
    <label htmlFor={`${id}-trailer`}>Upload video snippet</label>
    <input id={`${id}-trailer`} type="file" accept="video/mp4,video/webm" onChange={e => upload(e, 'trailer')} />
    <p>MP4 or WebM, up to 4 MB. For longer trailers, use a YouTube or Vimeo link.</p>
    <button type="button" onClick={() => setPreview(true)}>Preview trailer</button>
    {preview && (getTrailerEmbed(trailer.trim()) ? <div className={styles.trailer}><FilmTrailer src={getTrailerEmbed(trailer.trim())} title="Screening" poster={cover} /></div> : <p role="alert">Enter an HTTPS YouTube, Vimeo, MP4 or WebM video link.</p>)}
    {uploading && <p role="status">Uploading {uploading === 'cover' ? 'cover image' : 'video snippet'}…</p>}
    {error && <p role="alert">{error}</p>}
  </fieldset>
}
