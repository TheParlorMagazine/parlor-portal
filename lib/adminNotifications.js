import { serviceClient } from './apiAuth'
import { deliver } from './sendEmail'
import { sendStripeEmailOnce } from './stripeEmail'

const TO = 'lindsey@theparlormagazine.com'
const SITE = 'https://theparlormagazine.com'
const LAUNCH = Date.parse('2026-10-29T00:00:00Z')
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
function money(cents, currency) {
  const code = /^[a-z]{3}$/i.test(currency || '') ? currency.toUpperCase() : 'USD'
  return `${(Number(cents || 0) / 100).toFixed(2)} ${code}`
}
const row = (label, value) => `<p><strong>${esc(label)}:</strong> ${esc(value || 'Not provided')}</p>`
const list = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`
const shell = (title, content, path) => `<div style="max-width:640px;margin:auto;padding:24px;font-family:Georgia,serif;color:#222;line-height:1.6;"><h1 style="font-size:24px;">${esc(title)}</h1>${content}<p><a href="${SITE}${path}" style="color:#7A263A;">Open admin dashboard →</a></p></div>`

async function sendNotice({ key, type, subject, html }) {
  const result = await sendStripeEmailOnce({ eventId: key, type, to: TO,
    send: () => deliver({ type, to: TO, subject, html, vars: { notification: html }, idempotencyKey: `${type}:${key}` }),
  })
  if (result?.trackingStatus === 'failed' && result?.reason !== 'disabled') throw new Error('Admin notification rejected; retry required')
  return result
}

// Only a verified initial registration qualifies. Old/imported accounts and
// later sign-ins cannot create a new-signup alert; welcome email state is separate.
export async function notifyAdminFreeSignup(user, { provider } = {}) {
  if (!user?.id || !user.email_confirmed_at || !['email', 'google'].includes(provider)) return { skipped: true }
  const created = Date.parse(user.created_at), age = Date.now() - created
  if (!Number.isFinite(created) || created < LAUNCH || age < 0 || age > (provider === 'google' ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000)) return { skipped: true }
  if (provider === 'google') {
    const identity = user.identities?.find(i => i.provider === 'google')
    const identityCreated = Date.parse(identity?.created_at)
    if (!Number.isFinite(identityCreated) || Math.abs(identityCreated - created) > 60000) return { skipped: true }
  }
  const { data: member, error } = await serviceClient().from('members').select('email, full_name, plan').eq('id', user.id).single()
  if (error || !member) throw new Error('New signup notification could not load member')
  if (member.plan && !/^free$/i.test(member.plan.trim())) return { skipped: true }
  return sendNotice({ key: `member_signup:${user.id}`, type: 'admin_free_signup',
    subject: `New free signup — ${member.full_name || member.email || 'New member'}`,
    html: shell('New free signup', row('Name', member.full_name) + row('Email', member.email) + row('Registration', provider === 'google' ? 'Google' : 'Email'), '/admin'),
  })
}

export async function notifyAdminPaidSubscription({ session, subscription, member, planName }) {
  if (session?.livemode !== true || session.payment_status !== 'paid' || session.status !== 'complete' || !(session.amount_total > 0) || subscription?.status !== 'active' || !subscription.id) return { skipped: true }
  return sendNotice({ key: `new_subscription:${subscription.id}`, type: 'admin_paid_subscription',
    subject: `New paid subscription — ${planName}`,
    html: shell('New paid subscription', row('Name', member?.full_name || session.customer_details?.name) + row('Email', member?.email || session.customer_details?.email) + row('Plan', planName) + row('Paid', money(session.amount_total, session.currency)) + row('Subscription', subscription.id), '/admin'),
  })
}

export async function notifyAdminShopPurchase({ session, order, items, packing }) {
  if (session?.livemode !== true || session.payment_status !== 'paid' || session.status !== 'complete' || !session.id || !order?.id || order.status === 'cancelled') return { skipped: true }
  const currency = order.currency || session.currency
  const trickOrTreat = session.metadata?.kind === 'tot_bundle'
  const cart = (items || []).map(item => `${item.quantity} × ${item.product_name}${item.variant ? ` — ${item.variant}` : ''} — ${trickOrTreat && !item.unit_price_cents ? 'Included in bundle' : money(Number(item.unit_price_cents || 0) * Number(item.quantity || 0), currency)}`)
  const packed = (packing || []).map(item => `${item.quantity} × ${item.product_name}${item.variant ? ` — ${item.variant}` : ''}${item.bundle_name ? ` (${item.bundle_name})` : ''} — ${item.fulfillment === 'printify' ? 'Printify' : 'Self-fulfilled'}${item.sku ? ` — SKU ${item.sku}` : ''}`)
  const title = trickOrTreat ? 'New Trick-or-Treat purchase' : 'New shop purchase'
  // Treat line allocations may be zero: the paid order total remains authoritative.
  return sendNotice({ key: session.id, type: 'admin_shop_purchase',
    subject: `${title} — ${order.order_number || order.id}`,
    html: shell(title, row('Order', order.order_number || order.id) + row('Buyer', order.shipping_name || session.customer_details?.name) + row('Email', order.email || session.customer_details?.email) + row('Total paid', money(order.total_cents ?? session.amount_total, currency)) + row('Shipping', money(order.shipping_cents, currency)) + '<h2>Cart items</h2>' + list(cart) + '<h2>Packing and fulfillment</h2>' + list(packed) + row('Shipping address', order.shipping_address), '/admin'),
  })
}
