import { createClient } from '@supabase/supabase-js'

// Service-role client — needed because RLS hides unpublished (member-exclusive)
// library items from the anon key. We only ever SELECT list-level fields here,
// never full_text / transcript, so no paid content can leak from the list.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Verify the caller is a signed-in user (member gate) via their bearer token.
async function requireUser(request) {
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

const LIST_FIELDS = [
  'slug', 'title', 'subtitle', 'excerpt', 'cover_image_url',
  'category', 'article_category', 'theme', 'tags',
  'author_name', 'author_photo_url', 'date_published',
  'reading_time_minutes', 'thumbnail_style', 'is_new',
  'plan_access', 'paywall_type', 'published', 'media_type',
].join(', ')

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 })
  }

  const [{ data: themes, error: tErr }, { data: items, error: iErr }] = await Promise.all([
    admin
      .from('library_themes')
      .select('name, slug, description, forum_cta_text, sort_order')
      .order('sort_order', { ascending: true }),
    admin
      .from('articles')
      .select(LIST_FIELDS)
      .eq('in_library', true)
      .order('date_published', { ascending: false }),
  ])

  if (tErr || iErr) {
    return Response.json({ error: (tErr || iErr).message }, { status: 500 })
  }

  // Member-post articles only belong in the Library once published (community
  // drafts and unpublished member posts never appear here).
  const visible = (items || []).filter(a => a.media_type !== 'member_post' || a.published)

  return Response.json({ themes: themes || [], items: visible })
}
