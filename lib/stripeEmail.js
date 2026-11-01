import { createClient } from '@supabase/supabase-js'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export async function sendStripeEmailOnce({ eventId, type, to, send }) {
  if (!eventId || !type || !to) {
    throw new Error('Missing Stripe email tracking information')
  }

  const db = getDb()
  const recipient = to.trim().toLowerCase()

  const { data: claimed, error: claimError } = await db.rpc(
    'claim_stripe_email',
    {
      p_event_id: eventId,
      p_email_type: type,
      p_recipient: recipient
    }
  )

  // Never send if duplicate protection cannot be verified.
  if (claimError) throw claimError

  if (!claimed) {
    return { skipped: true, reason: 'already_claimed' }
  }

  let status = 'uncertain'
  let resendId = null

  try {
    const result = await send()

    if (result?.error || result?.skipped || !result?.data?.id) {
      // Only an explicit permanent rejection proves that Resend did not accept
      // the message. Timeouts, 5xx/app errors and malformed success responses
      // may have been accepted; keep their claim to prevent duplicate receipts.
      const rejected = ['validation_error','missing_required_field','invalid_access','restricted_api_key','invalid_api_key','not_found','method_not_allowed','rate_limit_exceeded'].includes(result?.error?.name)
      status = rejected || result?.skipped ? 'failed' : 'uncertain'
      console.error('Stripe email not accepted:', type, eventId, result)
    } else {
      status = 'accepted'
      resendId = result.data.id
    }

    return { ...result, trackingStatus: status }
  } catch (error) {
    console.error('Stripe email outcome uncertain:', type, eventId, error)
    return { error: 'send_outcome_uncertain', trackingStatus: status }
  } finally {
    const { error } = await db
      .from('stripe_email_deliveries')
      .update({
        status,
        resend_email_id: resendId,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_event_id', eventId)
      .eq('email_type', type)
      .eq('recipient', recipient)

    if (error) {
      console.error('Stripe email tracking update failed:', error)
    }
  }
}
