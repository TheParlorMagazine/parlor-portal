import crypto from 'crypto'

// Signed, non-guessable unsubscribe tokens so a raw member id can't be used to
// opt someone out. token = <memberId>.<base64url(HMAC-SHA256(memberId))>.
function secret() {
  return process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'parlor-dev-secret'
}
function sign(memberId) {
  return crypto.createHmac('sha256', secret()).update(String(memberId)).digest('base64url')
}
export function makeUnsubToken(memberId) {
  return `${memberId}.${sign(memberId)}`
}
export function verifyUnsubToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const idx = token.lastIndexOf('.')
  const memberId = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  try {
    const expected = sign(memberId)
    if (sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return memberId
  } catch {}
  return null
}
