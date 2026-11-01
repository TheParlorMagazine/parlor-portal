import crypto from 'crypto'

// Signed, non-guessable unsubscribe tokens so a raw member id can't be used to
// opt someone out. token = <memberId>.<base64url(HMAC-SHA256(memberId))>.
function secret() {
  return process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'parlor-dev-secret'
}
function sign(memberId, key = secret()) {
  return crypto.createHmac('sha256', key).update(String(memberId)).digest('base64url')
}
export function makeUnsubToken(memberId, campaignId = null) {
  const payload = campaignId ? `${memberId}:${campaignId}` : String(memberId)
  return `${payload}.${sign(payload)}`
}
export function verifyUnsubContext(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const idx = token.lastIndexOf('.')
  const memberId = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  try {
    // New sends use the dedicated secret; existing emails may have been signed
    // with CRON_SECRET or the service-role fallback before it was configured.
    const keys = [...new Set([
      secret(), process.env.NEWSLETTER_PREVIOUS_SECRET,
      process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY,
    ].filter(Boolean))]
    const valid = keys.some(key => {
      const expected = sign(memberId, key)
      return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    })
    if (valid) {
      const [id,campaignId,...extra] = memberId.split(':')
      if(extra.length || !id || (campaignId && !/^[0-9a-f-]{36}$/i.test(campaignId)))return null
      return {memberId:id,campaignId:campaignId || null}
    }
  } catch {}
  return null
}

export function verifyUnsubToken(token) { return verifyUnsubContext(token)?.memberId || null }
