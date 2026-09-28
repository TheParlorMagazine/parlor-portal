// Ensure a member has a Stripe customer, so we can save payment methods to it
// (with or without a membership) and reuse the same customer across every
// membership, purchase, and saved card. Returns the stripe_customer_id.
//
// db: a service-role Supabase client. stripe: a Stripe instance.
export async function ensureStripeCustomer(db, stripe, userId) {
  if (!userId) return null
  const { data: member } = await db
    .from('members').select('id, email, full_name, stripe_customer_id').eq('id', userId).single()
  if (!member) return null
  if (member.stripe_customer_id) return member.stripe_customer_id

  const customer = await stripe.customers.create({
    email: member.email || undefined,
    name: member.full_name || undefined,
    metadata: { member_id: member.id },
  })
  await db.from('members').update({ stripe_customer_id: customer.id }).eq('id', member.id)
  return customer.id
}
