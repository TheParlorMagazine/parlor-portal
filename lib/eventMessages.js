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
      const text = message.kind === 'promoted' ? `A place opened up — you’re now going to “${event.title}”.` :
        message.kind === 'going' ? `You’re going to “${event.title}”.` :
        message.kind === 'waitlist' ? `You’re on the waitlist for “${event.title}”, position ${position}. Your attendance is not confirmed.` :
        message.kind === 'waitlist_reminder' ? `“${event.title}” is coming up. You’re still waitlisted, position ${position}; your attendance is not confirmed.` :
        message.kind === 'staff_reminder' ? `You have automatic host/admin access to “${event.title}”, which is coming up.` :
        `Your RSVP for “${event.title}” has been cancelled. Your forum membership is unchanged.`
      const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
      const { error: notificationError } = await db.from('notifications').upsert({ id: message.id, member_id: message.member_id, type: 'event', message: text, link_to: 'event', link_ref: event.id, read: false }, { onConflict: 'id', ignoreDuplicates: true })
      if (notificationError) throw notificationError
      if (member?.email) {
        const { deliver } = await import('./sendEmail')
        const result = await deliver({ type: 'event_registration', critical: false, to: member.email, subject: text, vars: { message: text, eventUrl: `${site}/portal/events/${event.id}` }, idempotencyKey: `event-registration/${message.id}`,
          html: `<p>${escape(text)}</p><p><a href="${escape(site)}/portal/events/${event.id}">View event</a></p>` })
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
