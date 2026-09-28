import { createClient } from '@supabase/supabase-js'

// Service-role client (bypasses RLS). Server-only — never import into client code.
export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

// Verify the caller's Supabase session from the Authorization: Bearer <token>
// header. Returns the user, or null if unauthenticated.
export async function requireUser(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// The member row (role, full_name, plan) for a user id. Use to gate admin
// actions and paid-only features.
export async function memberOf(db, userId) {
  const { data } = await db.from('members').select('role, full_name, plan').eq('id', userId).single()
  return data || {}
}
