import { requireUser, serviceClient } from '../../../../../lib/apiAuth'

const FIELDS = 'slug, title, subtitle, author_name, author_photo_url, cover_image_url, category, article_category, theme, tags, body, excerpt, editor_note, discussion_prompt, date_published, reading_time_minutes, paywall_type, plan_access, is_new, thumbnail_style'

export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { slug } = await params
  const db = serviceClient()

  const { data: item, error } = await db
    .from('articles').select(FIELDS).eq('slug', slug).eq('in_library', true).maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 })

  let related = []
  if (item.theme) {
    const { data } = await db
      .from('articles')
      .select('slug, title, article_category, cover_image_url')
      .eq('in_library', true).eq('theme', item.theme).neq('slug', slug)
      .limit(4)
    related = data || []
  }

  const { data: themes } = await db
    .from('library_themes').select('name, slug').order('sort_order', { ascending: true })

  return Response.json({ item, related, themes: themes || [] })
}
