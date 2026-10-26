// Only trust explicit site origins, never arbitrary forwarded-host headers.
export function checkoutOrigin(request) {
  const internal = new URL(request.url).origin
  const allowed = new Set([internal, 'https://theparlormagazine.com', 'https://www.theparlormagazine.com'])
  for (const value of [process.env.NEXT_PUBLIC_SITE_URL, process.env.URL, process.env.DEPLOY_PRIME_URL]) {
    try { const url = new URL(value); if (url.protocol === 'https:') allowed.add(url.origin) } catch {}
  }
  try {
    const browser = new URL(request.headers?.get('origin'))
    if (allowed.has(browser.origin)) return browser.origin
  } catch {}
  return internal
}
