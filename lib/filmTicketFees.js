// Stripe reports actual processing fees on a charge's balance transaction.
// This is independent of the ticket's price, membership and access fulfillment.
export async function syncFilmTicketFee(db, stripe, ticket, providedCharge = null) {
  try {
    let charge = providedCharge
    if (!charge) {
      const { data: order, error } = await db.from('orders').select('stripe_payment_intent').eq('id', ticket.order_id).single()
      if (error || !order?.stripe_payment_intent) throw new Error('Payment unavailable')
      const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent, { expand: ['latest_charge.balance_transaction'] })
      charge = typeof intent.latest_charge === 'string' ? await stripe.charges.retrieve(intent.latest_charge, { expand: ['balance_transaction'] }) : intent.latest_charge
    }
    const transaction = typeof charge?.balance_transaction === 'string'
      ? await stripe.balanceTransactions.retrieve(charge.balance_transaction) : charge?.balance_transaction
    if (!transaction || !Number.isSafeInteger(transaction.fee) || transaction.fee < 0 || !/^[a-z]{3}$/.test(transaction.currency)) return { pending: true }
    const { error } = await db.from('film_club_tickets').update({
      stripe_processing_fee_cents: transaction.fee,
      stripe_fee_currency: transaction.currency,
      stripe_fee_checked_at: new Date().toISOString(),
    }).eq('id', ticket.id)
    if (error) throw error
    return { fee: transaction.fee, currency: transaction.currency }
  } catch { return { pending: true } }
}
export async function syncPendingFilmFees(db, stripe, { eventId, limit = 20 } = {}) {
  let query = db.from('film_club_tickets').select('id,order_id')
    .or('stripe_processing_fee_cents.is.null,stripe_fee_currency.is.null').order('stripe_fee_checked_at', {nullsFirst:true}).order('purchased_at').limit(limit)
  if (eventId) query = query.eq('event_id', eventId)
  const { data, error } = await query
  if (error) throw new Error('Could not load payment fees.')
  let updated = 0, pending = 0
  for (const ticket of data || []) {
    const result = await syncFilmTicketFee(db, stripe, ticket)
    if (result.pending) {
      pending++
      await db.from('film_club_tickets').update({stripe_fee_checked_at:new Date().toISOString()}).eq('id',ticket.id)
    } else updated++
  }
  return { updated, pending }
}
