import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * Check whether a user has access to a paywalled item.
 *
 * Access is granted if:
 *   - The user has an active membership (any non-free plan), OR
 *   - The user has an individual item_purchases record for this article + itemType
 *
 * itemType is required so that purchasing audio access on article X does not
 * grant access to video on the same article — those are separate purchases.
 *
 * @param {string} userId    - Supabase member UUID
 * @param {string} articleId - Article UUID
 * @param {string} itemType  - 'article' | 'audio' | 'video'
 * @returns {{ hasAccess: boolean, reason?: 'membership' | 'purchase' | 'not_logged_in' }}
 */
export async function checkItemAccess(userId, articleId, itemType) {
  if (!userId) return { hasAccess: false, reason: 'not_logged_in' }

  const supabase = getSupabase()

  // Check 1: has active membership
  const { data: member } = await supabase
    .from('members')
    .select('plan')
    .eq('id', userId)
    .single()

  if (member?.plan && member.plan !== 'free') {
    return { hasAccess: true, reason: 'membership' }
  }

  // Check 2: has individual purchase for this specific item
  const { data: purchase } = await supabase
    .from('item_purchases')
    .select('id')
    .eq('member_id', userId)
    .eq('article_id', articleId)
    .eq('item_type', itemType)
    .single()

  if (purchase) {
    return { hasAccess: true, reason: 'purchase' }
  }

  return { hasAccess: false }
}
