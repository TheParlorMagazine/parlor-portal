import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export async function POST(req) {
  const { gift_slug } = await req.json().catch(() => ({}))
  if (!gift_slug) return Response.json({ error: 'Missing gift_slug' }, { status: 400 })

  const supabase = admin()

  const { data: item, error: itemErr } = await supabase
    .from('gift_items')
    .select('slug, capacity')
    .eq('slug', gift_slug)
    .single()

  if (itemErr || !item) return Response.json({ error: 'Unknown gift' }, { status: 404 })

  if (item.capacity !== null) {
    const { count } = await supabase
      .from('gift_claims')
      .select('*', { count: 'exact', head: true })
      .eq('gift_slug', gift_slug)

    if (count >= item.capacity) {
      return Response.json({ error: 'Sold out' }, { status: 409 })
    }
  }

  const { error } = await supabase.from('gift_claims').insert({ gift_slug })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
