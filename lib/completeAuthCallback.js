// One exchange per browser client and callback URL, including React effect replay.
// Never fall back to an older account's session when a new OAuth code fails.
const callbacks = new WeakMap()

export function completeAuthCallback(client, location, request = fetch) {
  const key = location.search + location.hash
  let pending = callbacks.get(client)
  if (!pending) { pending = new Map(); callbacks.set(client, pending) }
  if (!pending.has(key)) pending.set(key, finish(client, location, request))
  return pending.get(key)
}

async function finish(client, location, request) {
  const params = new URLSearchParams(location.search)
  const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''))
  const authError = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error')
  if (authError) throw new Error(authError)
  const code = params.get('code')
  let result
  if (code) result = await client.auth.exchangeCodeForSession(code)
  else if (hash.get('access_token') && hash.get('refresh_token')) {
    result = await client.auth.setSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token') })
  } else result = await client.auth.getSession()

  if (result.error) throw result.error
  const session = result.data?.session
  if (!session?.access_token) throw new Error('We could not establish your login session. Please try signing in again.')
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) throw error || new Error('Could not verify your account.')

  if (params.get('flow') === 'signup') {
    // Keep existing onboarding nonblocking if the notification service fails.
    try { await request('/api/auth/onboarding', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } }) } catch {}
  }

  const returnTo = params.get('returnTo') || '/'
  try {
    const target = new URL(returnTo, location.origin)
    if (returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') && target.origin === location.origin && target.pathname !== '/auth/callback') {
      return target.pathname + target.search + target.hash
    }
  } catch {}
  return '/'
}

export function authCallbackMessage(error) {
  if (/pkce|code verifier|flow state/i.test(error?.message || '')) {
    return 'Your sign-in session expired or could not be found. Please start Google sign-in again in this same browser and tab.'
  }
  return error?.message || 'Authentication could not be completed. Please try again.'
}
