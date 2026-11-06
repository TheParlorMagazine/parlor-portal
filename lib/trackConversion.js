const sent = new Set()
// Only server-confirmed events and fixed, non-personal parameters reach Google.
export function trackConversion(event) {
  if (typeof window === 'undefined' || window.ParlorConsent?.analytics() !== true || navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl) return false
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''
  if (!/^G-[A-Z0-9]+$/.test(id) || typeof window.gtag !== 'function') return false
  const key = 'parlor-conversion:' + event.key
  try { if (sent.has(key) || localStorage.getItem(key)) return true } catch { if (sent.has(key)) return true }
  try {
    window.gtag('event',event.name,{...event.params,send_to:id,page_location:location.origin+location.pathname,page_referrer:''})
  } catch { return false }
  sent.add(key)
  try { localStorage.setItem(key,'1') } catch {}
  return true
}
