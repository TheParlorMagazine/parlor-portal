import { createClient } from '@supabase/supabase-js'

// Returns emails for given user IDs by querying auth.users via the
// service role key — only callable server-side from admin UI.
export async function POST(request) {
  const { ids } = await request.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ emails: {} })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const emails = {}
  await Promise.all(
    ids.map(async id => {
      const { data } = await supabase.auth.admin.getUserById(id)
      if (data?.user?.email) emails[id] = data.user.email
    })
  )

  return Response.json({ emails })
}
