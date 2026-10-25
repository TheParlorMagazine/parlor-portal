import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { requireUser } from './apiAuth'

// React shop uses bearer auth; the standalone Trick-or-Treat page uses the same
// Supabase session cookies. Neither route accepts a browser-supplied member id.
export async function requireShopUser(request) {
  if (request.headers.get('authorization')) return requireUser(request)
  const store = await cookies()
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { get: name => store.get(name)?.value } })
  const { data, error } = await auth.auth.getUser()
  return error ? null : data?.user || null
}
