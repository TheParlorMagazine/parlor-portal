// Convert a YouTube or Vimeo URL into an embeddable player URL. Returns null for
// anything else (we only support these two — nothing hosted in the portal).
export function toEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, '')
    // YouTube
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') { const id = u.searchParams.get('v'); return id ? `https://www.youtube.com/embed/${id}` : null }
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/)
      if (m) return `https://www.youtube.com/embed/${m[2]}`
      return null
    }
    // Vimeo
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
    if (host === 'player.vimeo.com') {
      return u.href
    }
    return null
  } catch { return null }
}
