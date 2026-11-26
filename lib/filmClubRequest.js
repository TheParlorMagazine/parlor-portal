import { createClient } from './supabase'

export async function filmClubRequest(path, method = 'GET', body) {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) throw new Error('Sign in to continue.')
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(result?.error || 'Film Club is unavailable. Check the server setup and migrations.'), {saved:result?.saved===true})
  return result
}
