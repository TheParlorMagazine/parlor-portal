// Admin presentation only. Newsletter consent must never cancel paid access.
export function subscriberStatus(member) {
  if (member.newsletter_subscribed === false || member.unsubscribed_at) return 'churned'
  if (['churned','cancelled','canceled','expired','unpaid','incomplete_expired'].includes(member.subscription_status)) return 'churned'
  return member.subscription_status || member.status || 'active'
}
