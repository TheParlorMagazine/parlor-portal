import { memberOf, requireUser, serviceClient } from '../../../../lib/apiAuth'
import { filmImageUrl, filmTrailerSource } from '../../../../lib/filmClubMedia'

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const json = (error, status) => Response.json({ error }, { status })

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: json('Sign in', 401) }
  const db = serviceClient()
  const { role } = await memberOf(db, user.id)
  if (!['admin', 'editor'].includes(role)) return { error: json('Forbidden', 403) }
  return { db, user, role }
}

function httpsUrl(value) {
  try { return typeof value === 'string' && new URL(value).protocol === 'https:' } catch { return false }
}

export async function GET(request) {
  const { db, error } = await gate(request)
  if (error) return error
  const { data, error: loadError } = await db.from('film_club_screenings')
    .select('*, event:events!inner(id,title,description,starts_at,ends_at,status,is_public,capacity,forum_id,cover_image_url), buyers:film_club_ticket_buyers(email)')
  if (loadError) return json('Could not load screenings. Check that the Film Club migrations are applied.', 503)
  return Response.json({ screenings: data.sort((a, b) => (b.event.starts_at || '').localeCompare(a.event.starts_at || '')) })
}

export async function POST(request) {
  const { db, user, error } = await gate(request)
  if (error) return error
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title || title.length > 200 || !uuid.test(body.id) || typeof body.starts_at !== 'string' || !Number.isFinite(Date.parse(body.starts_at))) {
    return json('Enter a title and valid screening date.', 400)
  }
  if (body.trailer_url && !filmTrailerSource(body.trailer_url)) return json('Enter an HTTPS YouTube, Vimeo, MP4 or WebM trailer URL.', 400)
  if (body.cover_image_url && !filmImageUrl(body.cover_image_url)) return json('Enter an HTTPS cover image URL.', 400)
  if (body.ticket_url && !httpsUrl(body.ticket_url)) return json('Enter an HTTPS ticket URL.', 400)
  const { data, error: createError } = await db.rpc('create_film_club_screening', {
    p_id: body.id, p_creator: user.id, p_title: title, p_starts_at: body.starts_at,
    p_description: typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : null,
    p_trailer_url: body.trailer_url || null, p_ticket_url: body.ticket_url || null,
  })
  if (createError) return json('Could not create the screening. Check that the Film Club migrations are applied.', 500)
  if (body.cover_image_url) {
    // The creation RPC is idempotent for this creator/ID; retries keep the same draft.
    const { data: saved, error: coverError } = await db.from('events').update({ cover_image_url: filmImageUrl(body.cover_image_url) })
      .eq('id', data).eq('created_by', user.id).select('id').maybeSingle()
    if (coverError || !saved) return json('The screening draft was created, but its cover could not be saved. Retry this form to save the cover.', 500)
  }
  return Response.json({ eventId: data }, { status: 201 })
}

export async function PATCH(request) {
  const { db, user, error } = await gate(request)
  if (error) return error
  const body = await request.json().catch(() => null)
  if (!uuid.test(body?.eventId)) return json('Select a screening.', 400)
  if (body.action === 'cover' || body.action === 'trailer') {
    const cover = body.action === 'cover'
    const value = cover ? body.cover_image_url : body.trailer_url
    if (typeof value !== 'string' || (value && !(cover ? filmImageUrl(value) : filmTrailerSource(value)))) {
      return json(cover ? 'Enter an HTTPS cover image URL.' : 'Enter an HTTPS YouTube, Vimeo, MP4 or WebM trailer URL.', 400)
    }
    const { data: screening, error: lookupError } = await db.from('film_club_screenings').select('event_id').eq('event_id', body.eventId).maybeSingle()
    if (lookupError) return json('Could not load the screening.', 500)
    if (!screening) return json('Screening not found.', 404)
    const { data: saved, error: saveError } = await db.from(cover ? 'events' : 'film_club_screenings')
      .update(cover ? { cover_image_url: value ? filmImageUrl(value) : null } : { trailer_url: value || null })
      .eq(cover ? 'id' : 'event_id', body.eventId).select(cover ? 'id' : 'event_id').maybeSingle()
    if (saveError) return json('Could not save screening media.', 500)
    return saved ? Response.json({ ok: true }) : json('Screening not found.', 404)
  }
  if (body.action === 'forum_visibility') {
    if (typeof body.visible !== 'boolean') return json('Choose forum visibility.', 400)
    const { data, error } = await db.from('film_club_screenings')
      .update({ discussion_active: body.visible, discussion_archived: !body.visible })
      .eq('event_id', body.eventId).not('forum_id', 'is', null).select('event_id').maybeSingle()
    if (error) return json('Could not save forum visibility.', 500)
    return data ? Response.json({ ok: true }) : json('Discussion not found.', 404)
  }
  if (body.action === 'discussion') {
    const fields = ['discussion_active', 'commenting_open', 'discussion_archived']
    if (!fields.includes(body.field) || typeof body.value !== 'boolean') return json('Invalid discussion setting.', 400)
    const { data, error } = await db.from('film_club_screenings').update({ [body.field]: body.value })
      .eq('event_id', body.eventId).not('forum_id', 'is', null).select('event_id').maybeSingle()
    if (error) return json('Could not save the discussion setting.', 500)
    return data ? Response.json({ ok: true }) : json('Discussion not found.', 404)
  }
  if (body.action === 'discussion_email') {
    if (typeof body.enabled !== 'boolean') return json('Select whether to send the discussion email.', 400)
    if (body.enabled) {
      const { data, error } = await db.from('events').select('ends_at,starts_at').eq('id', body.eventId).maybeSingle()
      if (error) return json('Could not check the screening end time.', 500)
      if (!data?.ends_at || (data.starts_at && Date.parse(data.ends_at) <= Date.parse(data.starts_at))) {
        return json('Set a screening end time after the start time in Edit screening first.', 400)
      }
    }
    const { data, error } = await db.from('film_club_screenings').update({ discussion_email_enabled: body.enabled })
      .eq('event_id', body.eventId).select('event_id').maybeSingle()
    if (error) return json('Could not save the email setting.', 500)
    return data ? Response.json({ ok: true }) : json('Screening not found.', 404)
  }
  if (body.action === 'ticket_buyers') {
    if (!Array.isArray(body.emails) || body.emails.length > 2000 ||
      !body.emails.every(email => typeof email === 'string' && email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
      return json('Enter up to 2,000 valid email addresses.', 400)
    }
    const { data, error } = await db.rpc('replace_film_club_ticket_buyers', { p_event: body.eventId, p_emails: body.emails })
    if (error) return json('Could not save the confirmed ticket buyers.', 500)
    return Response.json({ count: data })
  }
  if (body.action === 'tickets') {
    const amounts = [body.publicTickets, body.publicGrossCents]
    if (!amounts.every(n => n === null || Number.isInteger(n) && n >= 0 && n <= 2147483647)) return json('Enter valid ticket totals.', 400)
    const { error } = await db.rpc('save_film_public_sales', { p_event: body.eventId, p_actor: user.id, p_tickets: body.publicTickets, p_gross: body.publicGrossCents })
    if (error) return json('Could not save audited ticket totals.', 500)
    return Response.json({ ok: true })
  }
  const { data, error: queryError } = await db.from('film_club_screenings')
    .select('forum_id').eq('event_id', body.eventId).maybeSingle()
  if (queryError) return json('Could not load the screening discussion.', 500)
  const forumId = data?.forum_id
  if (!forumId) return json('This screening has no discussion.', 404)

  if (body.action === 'revoke' && uuid.test(body.memberId)) {
    const { error } = await db.from('film_club_forum_moderators').delete().eq('forum_id', forumId).eq('member_id', body.memberId)
    return error ? json('Could not revoke access.', 500) : Response.json({ ok: true })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const expires = Date.parse(body.expiresAt)
  if (body.action !== 'invite' || !email || !Number.isFinite(expires) || expires <= Date.now()) {
    return json('Enter the filmmaker’s Parlor account email and a future expiry.', 400)
  }
  const { data: member, error: lookupError } = await db.from('members').select('id').eq('email', email).maybeSingle()
  if (lookupError) return json('Could not look up this member.', 500)
  if (!member) return json('No existing Parlor member matches that email.', 404)
  const { error: grantError } = await db.from('film_club_forum_moderators').upsert({
    forum_id: forumId, member_id: member.id, invited_by: user.id, expires_at: new Date(expires).toISOString(),
  })
  if (grantError) return json('Could not grant moderator access.', 500)
  const { error: notificationError } = await db.from('notifications').insert({
    member_id: member.id,
    type: 'system',
    message: 'You’ve been invited to co-moderate a Film Club discussion.',
    link_to: 'film-club-moderation',
    link_ref: forumId,
    read: false,
  })
  return Response.json({ ok: true, notified: !notificationError, path: `/portal/film-club/moderate/${forumId}` })
}

export async function DELETE(request) {
  const { db, role, error } = await gate(request)
  if (error) return error
  if (role !== 'admin') return json('Only administrators can delete screening forums.', 403)
  const body = await request.json().catch(() => null)
  if (!uuid.test(body?.eventId) || !uuid.test(body?.forumId) || body.confirm !== true) return json('Confirm the screening forum to delete.', 400)
  const { data: screening, error: lookupError } = await db.from('film_club_screenings').select('forum_id').eq('event_id', body.eventId).maybeSingle()
  if (lookupError) return json('Could not load the screening forum.', 500)
  if (!screening?.forum_id || screening.forum_id !== body.forumId) return json('Screening forum not found.', 404)
  // Existing foreign keys cascade discussion content and clear screening/event links.
  // The screening, purchases and financial records are retained.
  const { data, error: deleteError } = await db.from('forums').delete().eq('id', screening.forum_id).select('id').maybeSingle()
  if (deleteError) return json('Could not delete the forum. No changes were saved.', 500)
  return data ? Response.json({ ok: true }) : json('Screening forum not found.', 404)
}
