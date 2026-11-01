const SITE = 'https://theparlormagazine.com'
const MEDIA_HOST = 'nxpwcdtduxsorbzoajbm.supabase.co'

// Only public Parlor media may be fetched. Never accept arbitrary origins,
// signed/private storage, redirects, credentials, or user-selected cloud names.
export function emailImageSource(value) {
  if (typeof value !== 'string' || value.length > 4096) return null
  try {
    const url = new URL(value.replace(/&amp;/g, '&'))
    if (url.protocol !== 'https:' || url.username || url.password || url.port || /%2f|%5c|%2e/i.test(url.pathname)) return null
    if (url.hostname === MEDIA_HOST && url.pathname.startsWith('/storage/v1/object/public/Media/')) {
      url.search = ''; url.hash = ''
      return url.href
    }
    if (url.hostname === 'res.cloudinary.com' && url.pathname.startsWith('/dwytmbczs/image/upload/')) {
      // Prefer the versioned original, before format/background transforms.
      const versioned = url.pathname.match(/^\/dwytmbczs\/image\/upload\/(?:.*\/)?(v\d+\/.+)$/)
      if (versioned) url.pathname = '/dwytmbczs/image/upload/' + versioned[1]
      url.search = ''; url.hash = ''
      return url.href
    }
  } catch {}
  return null
}

export function emailImageUrl(value, background = 'ffffff') {
  const source = emailImageSource(value)
  if (!source) return value
  const bg = ['ffffff', 'fdf0f3'].includes(background) ? background : 'ffffff'
  return `${SITE}/email-image?${new URLSearchParams({ src: source, bg, v: '1' })}`
}
