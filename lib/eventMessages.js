const escape = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
export async function deliverEventMessages(db, eventId = null) {
  const { data: messages, error } = await db.rpc('claim_event_registration_messages', { p_event: eventId })
  if (error) throw error
  for (const message of messages || []) {
    try {
      const { data: event, error: eventError } = await db.from('events').select('id,title,status').eq('id', message.event_id).single()
      const { data: member, error: memberError } = await db.from('members').select('email').eq('id', message.member_id).single()
      const { data: summary, error: summaryError } = await db.rpc('event_summary', { p_event: message.event_id, p_member: message.member_id })
      if (eventError || memberError || (summaryError && summaryError.code !== '42501')) throw eventError || memberError || summaryError
      const status = summary?.my_status
      const stale = (message.kind === 'cancelled' && ['going','waitlist','host'].includes(status)) || message.kind !== 'cancelled' && (!summary || event?.status !== 'published' ||
        (['going', 'promoted'].includes(message.kind) && status !== 'going') ||
        (message.kind.startsWith('waitlist') && status !== 'waitlist') ||
        (message.kind === 'staff_reminder' && status !== 'host'))
      if (stale) {
        await db.from('event_registration_messages').update({ sent_at: new Date().toISOString(), last_error: 'superseded' }).eq('id', message.id)
        continue
      }
      const position = summary?.queue_position || message.queue_position
      let filmRsvp = false
      if (['going', 'promoted'].includes(message.kind)) {
        const { data: rsvp, error: rsvpError } = await db.from('event_rsvps')
          .select('film_club_paid_at_rsvp').eq('event_id', message.event_id).eq('member_id', message.member_id).maybeSingle()
        if (rsvpError && !['42703', 'PGRST204'].includes(rsvpError.code)) throw rsvpError
        filmRsvp = Boolean(rsvp?.film_club_paid_at_rsvp)
      }
      const text = filmRsvp ? `We received your complimentary Film Club RSVP for “${event.title}”. You’ll receive your viewing link shortly.` :
        message.kind === 'promoted' ? `A place opened up — you’re now going to “${event.title}”.` :
        message.kind === 'going' ? `You’re going to “${event.title}”.` :
        message.kind === 'waitlist' ? `You’re on the waitlist for “${event.title}”, position ${position}. Your attendance is not confirmed.` :
        message.kind === 'waitlist_reminder' ? `“${event.title}” is coming up. You’re still waitlisted, position ${position}; your attendance is not confirmed.` :
        message.kind === 'staff_reminder' ? `You have automatic host/admin access to “${event.title}”, which is coming up.` :
        `Your RSVP for “${event.title}” has been cancelled. Your forum membership is unchanged.`
      const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
      const { error: notificationError } = await db.from('notifications').upsert({ id: message.id, member_id: message.member_id, type: 'event', message: text, link_to: 'event', link_ref: event.id, read: false }, { onConflict: 'id', ignoreDuplicates: true })
      if (notificationError) throw notificationError
      let recipient = member?.email
      if (filmRsvp) {
        const { data: contact, error: contactError } = await db.from('event_rsvps')
          .select('film_club_rsvp_email').eq('event_id', message.event_id).eq('member_id', message.member_id).maybeSingle()
        if (contactError && !['42703', 'PGRST204'].includes(contactError.code)) throw contactError
        recipient = contact?.film_club_rsvp_email || recipient
      }
      if (recipient) {
        const { deliver } = await import('./sendEmail')
        const eventUrl = `${site}/portal/events/${event.id}`
        const type = filmRsvp ? 'film_club_rsvp' : 'event_registration'
        const vars = filmRsvp ? { eventTitle: escape(event.title), eventUrl } : { message: text, eventUrl }
        const html = filmRsvp
          ? (await import('./emails')).renderDefaultEmail(type, { eventTitle: event.title, eventUrl })
          : `<p>${escape(text)}</p><p><a href="${escape(eventUrl)}">View event</a></p>`
        const result = await deliver({
          type, critical: false, to: recipient,
          subject: filmRsvp ? `Film Club RSVP received: ${event.title}` : text,
          vars, html, idempotencyKey: `event-registration/${message.id}`,
        })
        if (result?.error || (!result?.data?.id && !result?.skipped)) throw new Error('Email was not accepted')
      }
      const { error: markError } = await db.from('event_registration_messages').update({ sent_at: new Date().toISOString(), last_error: null }).eq('id', message.id)
      if (markError) throw markError
    } catch {
      await db.from('event_registration_messages').update({ last_error: 'Delivery failed; retry pending' }).eq('id', message.id)
      console.error('Event message delivery failed', message.id)
    }
  }
}
