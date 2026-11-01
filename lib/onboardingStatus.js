// Legacy imports and the current sender use different columns. Keep every
// dashboard/export and the duplicate guard consistent without inventing dates.
export function hasWelcomeBeenSent(member) {
  return member?.onboarding_email_sent === true || member?.onboarding_sent === true || member?.onboarding_sent_at != null
}
