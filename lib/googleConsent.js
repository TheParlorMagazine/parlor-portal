// Self-contained so the same defaults run in the initial HTML and client fallback.
export function initializeGoogleConsent(w) {
  if (w.__parlorGoogleConsent) return
  w.__parlorGoogleConsent = true
  w.dataLayer = w.dataLayer || []
  w.gtag = w.gtag || function () { w.dataLayer.push(arguments) }
  w.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
    wait_for_update: 500,
  })
  w.gtag('set', 'ads_data_redaction', true)
  w.gtag('set', 'url_passthrough', false)
}
export const googleConsentBootstrap = `(${initializeGoogleConsent.toString()})(window);`
