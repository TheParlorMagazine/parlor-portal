// Browser-side image compression, run before uploading to Supabase Storage so we
// stop storing 15–20 MB camera originals. Downscales to a sane max dimension and
// re-encodes to WebP (falling back to JPEG), keeping the file only if it's smaller.
//
// Returns { file, ext, contentType } — for SVG/GIF, non-images, or cases where
// compression wouldn't help, it returns the original untouched.

const SKIP_TYPES = /^image\/(svg\+xml|gif)$/i

export async function prepareImageUpload(file, { maxDim = 2200, quality = 0.82 } = {}) {
  const origExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const passthrough = { file, ext: origExt, contentType: file.type || 'application/octet-stream' }

  if (typeof document === 'undefined') return passthrough
  if (!file.type || !file.type.startsWith('image/') || SKIP_TYPES.test(file.type)) return passthrough

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try { bitmap = await createImageBitmap(file) } catch { return passthrough }
  }

  const { width, height } = bitmap
  const scale = Math.min(1, maxDim / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close?.(); return passthrough }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  const blob = await encode(canvas, quality)
  if (!blob || blob.size >= file.size) return passthrough

  const type = blob.type || 'image/jpeg'
  const ext = type === 'image/webp' ? 'webp' : 'jpg'
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return { file: new File([blob], `${base}.${ext}`, { type }), ext, contentType: type }
}

// Guards against the same file being uploaded twice in one action (the source of
// duplicate storage objects). Pass a useRef() and the File; returns true if this
// exact file was already uploaded within `windowMs` (so the caller should skip).
export function isDuplicateUpload(ref, file, windowMs = 5000) {
  if (!file) return false
  const sig = `${file.name}:${file.size}:${file.lastModified}`
  const now = Date.now()
  if (ref.current && ref.current.sig === sig && now - ref.current.t < windowMs) return true
  ref.current = { sig, t: now }
  return false
}

function encode(canvas, quality) {
  return new Promise(resolve => {
    // Prefer WebP (smaller, preserves alpha). If the browser can't encode WebP,
    // toBlob yields a non-webp blob — in that case fall back to JPEG.
    canvas.toBlob(b => {
      if (b && b.type === 'image/webp') return resolve(b)
      canvas.toBlob(j => resolve(j), 'image/jpeg', quality)
    }, 'image/webp', quality)
  })
}
