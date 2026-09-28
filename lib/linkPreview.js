// Fetch a URL's Open Graph preview (title / description / image) server-side.
// Best-effort: returns null on any failure, times out fast, caps HTML read.
export async function fetchLinkPreview(url) {
  try {
    const u = new URL(url)
    if (!/^https?:$/.test(u.protocol)) return null
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheParlorBot/1.0)' } })
    clearTimeout(t)
    if (!res.ok) return { url, title: u.hostname, description: '', image: null }
    const html = (await res.text()).slice(0, 200000)

    const meta = (prop) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
      const tag = html.match(re)?.[0]
      return tag ? (tag.match(/content=["']([^"']*)["']/i)?.[1] || '') : ''
    }
    const decode = s => (s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()

    const title = decode(meta('og:title') || (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '')) || u.hostname
    const description = decode(meta('og:description') || meta('description'))
    let image = meta('og:image') || meta('og:image:url') || meta('twitter:image')
    if (image && image.startsWith('//')) image = u.protocol + image
    else if (image && image.startsWith('/')) image = u.origin + image
    return { url, title: title.slice(0, 200), description: description.slice(0, 300), image: image || null }
  } catch { return null }
}
