// Admin presentation only. Newsletter consent must never cancel paid access.
export function subscriberStatus(member) {
  if (member.newsletter_subscribed === false || member.unsubscribed_at) return 'churned'
  return member.status || member.subscription_status || 'active'
}
