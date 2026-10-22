import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

export async function POST(request) {
  const user = await requireUser(request)

  if (!user) {
    return Response.json({ error: 'Please sign in.' }, { status: 401 })
  }

  const db = serviceClient()
  const member = await memberOf(db, user.id)

  if (member?.role !== 'admin') {
    return Response.json(
      { error: 'Master Admin access required.' },
      { status: 403 }
    )
  }

  let body

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const {
    ask_id,
    amount,
    units,
    external_reference,
    verified
  } = body

  if (verified !== true) {
    return Response.json(
      { error: 'Please confirm the donation was verified in MonkeyPod.' },
      { status: 400 }
    )
  }

  if (typeof ask_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(ask_id)) {
    return Response.json({ error: 'Invalid donation ask.' }, { status: 400 })
  }

  if (typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(amount * 100)) {
    return Response.json({ error: 'Enter a valid donation amount.' }, { status: 400 })
  }

  if (!Number.isInteger(units) || units < 1) {
    return Response.json({ error: 'Invalid number of units.' }, { status: 400 })
  }

  const { data: ask, error: askError } = await db
    .from('fundraising_asks')
    .select('id, campaign_id')
    .eq('id', ask_id)
    .single()

  if (askError || !ask) {
    return Response.json({ error: 'Donation ask not found.' }, { status: 404 })
  }

  const reference = typeof external_reference === 'string'
    ? external_reference.trim()
    : ''

  if (reference.length > 200) {
    return Response.json({ error: 'Reference is too long.' }, { status: 400 })
  }

  const { data, error } = await db
    .from('fundraising_contributions')
    .insert({
      ask_id: ask.id,
      amount,
      units,
      source: 'monkeypod',
      external_reference: reference || null
    })
    .select()
    .single()

  if (error) {
    return Response.json(
      { error: error.code === '23505'
        ? 'This MonkeyPod reference has already been recorded.'
        : error.message },
      { status: error.code === '23505' ? 409 : 500 }
    )
  }

  return Response.json({ contribution: data }, { status: 201 })
}
