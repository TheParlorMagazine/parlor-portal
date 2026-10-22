import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

async function authorize(request) {
  const user = await requireUser(request)

  if (!user) {
    return {
      error: Response.json(
        { error: 'Please sign in.' },
        { status: 401 }
      )
    }
  }

  const db = serviceClient()
  const member = await memberOf(db, user.id)

  if (member?.role !== 'admin') {
    return {
      error: Response.json(
        { error: 'Master Admin access required.' },
        { status: 403 }
      )
    }
  }

  return { db }
}

export async function GET(request) {
  const auth = await authorize(request)
  if (auth.error) return auth.error

  const { data: campaigns, error: campaignError } = await auth.db
    .from('fundraising_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (campaignError) {
    return Response.json(
      { error: campaignError.message },
      { status: 500 }
    )
  }

  const { data: asks, error: asksError } = await auth.db
    .from('fundraising_asks')
    .select('*')
    .order('display_order')

  if (asksError) {
    return Response.json(
      { error: asksError.message },
      { status: 500 }
    )
  }

  const { data: contributions, error: contributionsError } = await auth.db
    .from('fundraising_contributions')
    .select('id, ask_id, amount, units, confirmed_at')

  if (contributionsError) {
    return Response.json(
      { error: contributionsError.message },
      { status: 500 }
    )
  }

  const enrichedAsks = (asks || []).map(ask => {
    const confirmed = (contributions || []).filter(
      contribution => contribution.ask_id === ask.id
    )

    const raised = confirmed.reduce(
      (total, contribution) => total + Number(contribution.amount),
      0
    )

    const unitPrice = Number(ask.amount)
    const unitsFunded = unitPrice > 0
      ? Math.floor((raised + 0.000001) / unitPrice)
      : 0

    return {
      ...ask,
      raised,
      units_funded: unitsFunded,
      remaining: ask.capacity === null
        ? null
        : Math.max(0, ask.capacity - unitsFunded)
    }
  })

  return Response.json({
    campaigns: (campaigns || []).map(campaign => ({
      ...campaign,
      asks: enrichedAsks.filter(
        ask => ask.campaign_id === campaign.id
      )
    }))
  })
}
