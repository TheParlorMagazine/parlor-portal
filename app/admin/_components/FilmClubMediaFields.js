'use client'

import { useId, useRef, useState } from 'react'
import FilmTrailer, { getTrailerEmbed } from '../../_components/FilmTrailer'
import { uploadToCloudinary } from '../../../lib/uploadImage'
import { filmUploadError } from '../../../lib/filmClubMedia'
import styles from './FilmClubAdmin.module.css'

function MediaUpload({id,title,kind,disabled,busy,filename,onFile,onError}) {
  const input=useRef(null),[dragging,setDragging]=useState(false)
  const blocked=element=>disabled||!!element.closest('fieldset:disabled')
  function accept(files,element){
    if(blocked(element))return
    if(files.length!==1){onError('Choose one file at a time.');return}
    onFile(files[0],kind)
  }
  return <div className={styles.uploadField}>
    <label htmlFor={id}>{title}</label>
    <div className={styles.uploadDrop} role="group" aria-label={kind==='cover'?'Cover image drop area':'Video snippet drop area'} aria-busy={busy} aria-disabled={disabled} data-dragging={dragging&&!disabled}
      onDragEnter={e=>{e.preventDefault();if(!blocked(e.currentTarget))setDragging(true)}}
      onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=blocked(e.currentTarget)?'none':'copy'}}
      onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false)}}
      onDrop={e=>{e.preventDefault();setDragging(false);accept(Array.from(e.dataTransfer.files),e.currentTarget)}}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5"/></svg>
      <div className={styles.uploadCopy} aria-live="polite"><span>{busy?'Uploading…':filename || (kind==='cover'?'Drag an image here':'Drag a video here')}</span><small>{kind==='cover'?'JPG, PNG, WebP or GIF':'MP4 or WebM'} · Up to 4 MB</small></div>
      <button type="button" className={styles.uploadChoose} disabled={disabled} aria-label={kind==='cover'?'Choose cover image file':'Choose video snippet file'} onClick={()=>input.current?.click()}>Choose file</button>
      <input ref={input} id={id} className={styles.uploadInput} type="file" tabIndex={-1} disabled={disabled} accept={kind==='cover'?'image/jpeg,image/png,image/webp,image/gif':'video/mp4,video/webm'} onChange={e=>{const files=Array.from(e.currentTarget.files || []);e.currentTarget.value='';if(files.length)accept(files,e.currentTarget)}}/>
    </div>
  </div>
}

export default function FilmClubMediaFields({ cover, trailer, onCover, onTrailer, disabled, onUploading }) {
  const id = useId()
  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [names,setNames]=useState({cover:'',trailer:''})
  const uploadLock=useRef(false)
  async function upload(file, kind) {
    if (!file || disabled || uploadLock.current) return
    const error = filmUploadError(file, kind)
    if (error) { setError(error); return }
    uploadLock.current=true
    setError(''); setUploading(kind); onUploading?.(true)
    try {
      const url = await uploadToCloudinary(file, 'parlor/film-club')
      if (kind === 'cover') onCover(url)
      else { onTrailer(url); setPreview(true) }
      setNames(old=>({...old,[kind]:file.name}))
    } catch { setError('Upload failed. Please try again.') }
    finally { uploadLock.current=false; setUploading(''); onUploading?.(false) }
  }
  return <fieldset className={styles.mediaFields} disabled={disabled || !!uploading}>
    <legend>Screening images and trailer</legend>
    <label>Cover image URL<input name="cover_image_url" type="url" value={cover} onChange={e => {onCover(e.target.value);setNames(old=>({...old,cover:''}))}} placeholder="https://" /></label>
    <MediaUpload id={`${id}-cover`} title="Upload cover image" kind="cover" disabled={disabled || !!uploading} busy={uploading==='cover'} filename={names.cover} onFile={upload} onError={setError}/>
    <p>This cover appears on the Film Club main page and screening details.</p>
    {cover && <img className={styles.coverPreview} src={cover} alt="Screening cover preview" />}
    <label>Trailer URL<input name="trailer_url" type="url" value={trailer} onChange={e => { onTrailer(e.target.value); setPreview(false);setNames(old=>({...old,trailer:''})) }} placeholder="YouTube, Vimeo, or a direct MP4/WebM link" /></label>
    <MediaUpload id={`${id}-trailer`} title="Upload video snippet" kind="trailer" disabled={disabled || !!uploading} busy={uploading==='trailer'} filename={names.trailer} onFile={upload} onError={setError}/>
    <p>For longer trailers, use a YouTube or Vimeo link.</p>
    <button type="button" onClick={() => setPreview(true)}>Preview trailer</button>
    {preview && (getTrailerEmbed(trailer.trim()) ? <div className={styles.trailer}><FilmTrailer src={getTrailerEmbed(trailer.trim())} title="Screening" poster={cover} /></div> : <p role="alert">Enter an HTTPS YouTube, Vimeo, MP4 or WebM video link.</p>)}
    {uploading && <p role="status">Uploading {uploading === 'cover' ? 'cover image' : 'video snippet'}…</p>}
    {error && <p role="alert">{error}</p>}
  </fieldset>
}
