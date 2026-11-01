// Inspect verified auth data, never browser-supplied signup flags. A later
// sign-in, recovery link or newly linked identity is not a new registration.
export function initialSignupProvider(user, now = Date.now()) {
  if (!user?.email_confirmed_at) return null
  const created = Date.parse(user.created_at)
  const confirmed = Date.parse(user.email_confirmed_at)
  if (!Number.isFinite(created) || !Number.isFinite(confirmed) || created > now || confirmed > now || confirmed < created) return null
  const google = user.identities?.find(identity => identity.provider === 'google')
  const identity = google || user.identities?.find(identity => identity.provider === 'email')
  const identityCreated = Date.parse(identity?.created_at)
  if (!Number.isFinite(identityCreated) || Math.abs(identityCreated - created) > 60000) return null
  if (google) return now - created <= 10 * 60000 ? 'google' : null
  return now - created <= 24 * 60 * 60000 && now - confirmed <= 10 * 60000 ? 'email' : null
}
