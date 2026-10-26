const TYPES = new Set(['email.delivered','email.opened','email.clicked','email.bounced','email.failed','email.complained'])

export function trackingEvent(payload, messageId) {
  if (!TYPES.has(payload?.type)) return null
  const emailId = payload.data?.email_id
  const date = new Date(payload.created_at)
  if (typeof emailId !== 'string' || !emailId || emailId.length > 256 || typeof messageId !== 'string' || !messageId || messageId.length > 256 || !payload.created_at || Number.isNaN(date.getTime())) throw new Error('Invalid tracking event')
  let link = null
  if (payload.type === 'email.clicked' && typeof payload.data?.click?.link === 'string') {
    try {
      const url = new URL(payload.data.click.link)
      if (['https:','http:'].includes(url.protocol)) {
        // Do not retain unsubscribe tokens, personal query strings, IPs or UAs.
        url.username = ''; url.password = ''; url.search = ''; url.hash = ''
        link = url.toString().slice(0,2048)
      }
    } catch {}
  }
  return { event_id: messageId, provider_email_id: emailId, event_type: payload.type, occurred_at: date.toISOString(), link }
}
