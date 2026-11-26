// Dates are event-driven: sales close at the start; Stripe archival happens after the end.
export function filmSalesOpen(screening, now = Date.now()) {
  const event = screening.event || {}
  return !!(screening.sales_enabled && !screening.stripe_archived && event.status === 'published' && event.is_public && Number.isFinite(Date.parse(event.starts_at)) && Date.parse(event.starts_at) > now)
}
export function filmHasEnded(screening, now = Date.now()) {
  return !!screening.event?.ends_at && Date.parse(screening.event.ends_at) <= now
}
export async function archiveFinishedFilmProducts(db, stripe, { limit = 10 } = {}) {
  const { data, error } = await db.from('film_club_screenings')
    .select('event_id,stripe_product_id,stripe_price_id,stripe_archived,event:events!inner(ends_at)')
    .eq('stripe_archived', false).not('stripe_product_id', 'is', null)
    .lte('event.ends_at', new Date().toISOString()).order('stripe_archive_checked_at', {nullsFirst:true}).limit(limit)
  if (error) throw new Error('Could not load finished screenings.')
  let archived = 0, failed = 0
  for (const screening of data || []) {
    try {
      await archiveFilmProduct(db,stripe,screening)
      archived++
    } catch { failed++ }
  }
  return { archived, failed }
}

export async function archiveFilmProduct(db,stripe,screening) {
  if(!filmHasEnded(screening))throw Error('Ticket products can only be archived after the event ends.')
  if(!screening.stripe_product_id)throw Error('This screening has no Stripe ticket product.')
  // Local sales close first, including retries after an uncertain Stripe response.
  const { error: stopError } = await db.from('film_club_screenings').update({ sales_enabled: false, stripe_archive_checked_at: new Date().toISOString() }).eq('event_id', screening.event_id)
  if (stopError) throw new Error('Could not close ticket sales.')
  const product = await stripe.products.retrieve(screening.stripe_product_id)
  if (product.metadata?.screening_id !== screening.event_id) throw new Error('Ticket product identity mismatch.')
  for await (const price of stripe.prices.list({ product: screening.stripe_product_id, active: true, limit: 100 })) {
    await stripe.prices.update(price.id, { active: false })
  }
  await stripe.products.update(screening.stripe_product_id, { active: false })
  const { error: saved } = await db.rpc('mark_finished_film_archived', { p_event: screening.event_id, p_product: screening.stripe_product_id })
  if (saved) throw new Error('Could not record archived product.')
}
