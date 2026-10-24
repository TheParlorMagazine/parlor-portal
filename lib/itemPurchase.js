import { serviceClient } from './apiAuth'
import { sendStripeEmailOnce } from './stripeEmail'
import { sendItemPurchaseEmail } from './emails'

// Used by both the signed Stripe webhook and the authenticated return page.
// A return URL flag alone never grants access.
export async function fulfillItemPurchase(session, { user = null, articleId = null } = {}) {
  const meta = session.metadata || {}
  if (session.mode !== 'payment' || !['article', 'audio', 'video'].includes(meta.itemType) || !meta.articleId) throw new Error('Invalid item checkout')
  if (articleId && meta.articleId !== articleId) throw new Error('Checkout belongs to another article')
  if (session.payment_status !== 'paid' || session.status !== 'complete') return { status: 'pending' }
  const db = serviceClient()
  let memberId = meta.userId || session.client_reference_id
  if (!memberId && session.customer) {
    const { data } = await db.from('members').select('id').eq('stripe_customer_id', typeof session.customer === 'string' ? session.customer : session.customer.id).maybeSingle()
    memberId = data?.id
  }
  // Historical guest purchases may be claimed only by a verified account with
  // the same email as the paid Stripe checkout. Never accept a browser userId.
  if (!memberId && user?.email_confirmed_at && user.email?.toLowerCase() === session.customer_details?.email?.toLowerCase()) memberId = user.id
  if (!memberId) return { status: 'needs_account' }
  if (user && user.id !== memberId) throw new Error('Checkout belongs to another account')
  const { data: article, error: articleError } = await db.from('articles').select('id, title, slug').eq('id', meta.articleId).single()
  if (articleError || !article) throw new Error('Purchased article could not be found')
  const { data: existing, error: lookupError } = await db.from('item_purchases').select('id').eq('member_id', memberId).eq('article_id', meta.articleId).eq('item_type', meta.itemType).limit(1).maybeSingle()
  if (lookupError) throw new Error('Could not check purchased access')
  if (!existing) {
    const { error } = await db.from('item_purchases').insert({ member_id: memberId, article_id: meta.articleId, item_type: meta.itemType })
    if (error && error.code !== '23505') throw new Error('Could not save purchased access')
  }
  // Receipt failure must never take away successfully saved access.
  try {
    const { data: member } = await db.from('members').select('email, full_name').eq('id', memberId).single()
    if (member?.email) await sendStripeEmailOnce({
      eventId: session.id, type: 'item_purchase', to: member.email,
      send: () => sendItemPurchaseEmail({ to: member.email, name: member.full_name, title: article.title, slug: article.slug, itemType: meta.itemType, amount: session.amount_total, currency: session.currency }),
    })
  } catch (error) { console.error('Item purchase receipt could not be sent:', error.message) }
  return { status: 'confirmed', itemType: meta.itemType, slug: article.slug }
}
