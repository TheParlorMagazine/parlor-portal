// Segment resolution — shared by the segments admin API and (later) forum
// membership snapshotting. Pass a service-role Supabase client.

// Fixed, computed-live audiences. `where` is applied to a members query.
export const PREDEFINED = [
  { key: 'plan_free',    name: 'Free Plan',           type: 'plan',       desc: 'Subscribers on the free plan',   where: q => q.or('plan.is.null,plan.eq.free') },
  { key: 'plan_circle',  name: "Reader's Circle",     type: 'plan',       desc: '$10/mo digital subscribers',      where: q => q.in('plan', ["Reader's Circle", 'circle']) },
  { key: 'plan_press',   name: 'Printing Press',      type: 'plan',       desc: '$25/mo print + digital',          where: q => q.in('plan', ['Printing Press', 'press', 'print']) },
  { key: 'new_30d',      name: 'Signed Up (30 days)', type: 'behavior',   desc: 'Joined in the last 30 days',      where: q => q.gte('joined_at', new Date(Date.now() - 30 * 86400000).toISOString()) },
  { key: 'high_engage',  name: 'Highly Engaged',      type: 'engagement', desc: 'Engagement score ≥ 20',           where: q => q.gte('engagement_score', 20) },
  { key: 'low_engage',   name: 'At-Risk',             type: 'engagement', desc: 'Engagement score ≤ 5',            where: q => q.lte('engagement_score', 5) },
]

const byKey = Object.fromEntries(PREDEFINED.map(p => [p.key, p]))

// Active members only (never target deactivated accounts).
function baseMembers(db) {
  return db.from('members').select('id').eq('deactivated', false)
}

// Member ids for a predefined audience key.
export async function predefinedMemberIds(db, key) {
  const p = byKey[key]
  if (!p) return []
  const { data } = await p.where(baseMembers(db))
  return (data || []).map(m => m.id)
}

// Live counts for every predefined audience (for the admin table).
export async function predefinedCounts(db) {
  const out = {}
  await Promise.all(PREDEFINED.map(async p => {
    const { count } = await p.where(db.from('members').select('id', { count: 'exact', head: true }).eq('deactivated', false))
    out[p.key] = count || 0
  }))
  return out
}

// Member ids for a stored segment row. Manual → join table; otherwise treat
// filter_config.key as a predefined audience.
export async function segmentMemberIds(db, segment) {
  if (!segment) return []
  if ((segment.filter_type || 'manual') === 'manual') {
    const { data } = await db.from('email_segment_members').select('member_id').eq('segment_id', segment.id)
    return (data || []).map(r => r.member_id)
  }
  const key = segment.filter_config?.key
  if (key) return predefinedMemberIds(db, key)
  return []
}
