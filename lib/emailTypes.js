// Registry of every email the system sends. Drives the admin Email Management
// tabs (Templates + Automations) and the send-time gate/override in lib/sendEmail.js.
// `critical: true` = transactional emails that ALWAYS send regardless of the
// toggle (password reset, payment/receipt) — shown as "Required" in the UI.
export const EMAIL_TYPES = [
  { type: 'admin_free_signup', name: 'Admin — New Free Signup', trigger: 'Verified new free member; sent to Lindsey', critical: false, defaultEnabled: true, vars: ['notification'] },
  { type: 'admin_paid_subscription', name: 'Admin — New Paid Subscription', trigger: 'New live paid subscription checkout; excludes renewals', critical: false, defaultEnabled: true, vars: ['notification'] },
  { type: 'admin_shop_purchase', name: 'Admin — New Shop Purchase', trigger: 'Live paid shop or Trick-or-Treat order, with cart and packing items', critical: false, defaultEnabled: true, vars: ['notification'] },
  { type: 'welcome',           name: 'Welcome Email',              trigger: 'New subscriber signs up',        critical: false, defaultEnabled: true,  vars: ['name'] },
  { type: 'weekly_digest',     name: 'Bi-weekly Digest',           trigger: 'Portal activity, every other week (alternates with the Newsletter)', critical: false, defaultEnabled: true, vars: ['name'] },
  { type: 'password_reset',    name: 'Password Reset',             trigger: 'Password reset requested',       critical: true,  defaultEnabled: true,  vars: ['name', 'resetUrl'] },
  { type: 'payment_confirmed', name: 'Payment Confirmation / Receipt', trigger: 'Payment received',           critical: true,  defaultEnabled: true,  vars: ['name', 'planName', 'amount'] },
  { type: 'item_purchase', name: 'Article / Audio / Video Purchase Receipt', trigger: 'One-time digital purchase confirmed', critical: true, defaultEnabled: true, vars: ['name', 'title', 'articleUrl', 'amount', 'itemType'] },
  { type: 'payment_failed',    name: 'Payment Failed',             trigger: 'A payment fails',                critical: true,  defaultEnabled: true,  vars: ['name', 'planName'] },
  { type: 'plan_upgraded',     name: 'Plan Upgraded',              trigger: 'Subscriber upgrades plan',       critical: false, defaultEnabled: true,  vars: ['name', 'oldPlan', 'newPlan'] },
  { type: 'cancellation',      name: 'Cancellation',               trigger: 'Subscriber cancels',             critical: false, defaultEnabled: true,  vars: ['name', 'planName'] },
  { type: 'event_rsvp',        name: 'Event RSVP Confirmation',    trigger: 'Member RSVPs to an event',       critical: false, defaultEnabled: true,  vars: ['name', 'eventTitle', 'eventWhen', 'eventWhere', 'eventUrl'] },
  { type: 'event_registration', name: 'Event waitlist and attendance updates', trigger: 'Registration, promotion, cancellation, and waitlist/host reminders', critical: false, defaultEnabled: true, vars: ['message', 'eventUrl'] },
  { type: 'event_reminder',    name: 'Event Reminder',             trigger: 'Before an event starts',         critical: false, defaultEnabled: true,  vars: ['name', 'eventTitle', 'eventWhen', 'eventUrl'] },
  { type: 'forum_invite',      name: 'Forum Invite',               trigger: 'Member invited to a forum',      critical: false, defaultEnabled: true,  vars: ['forumName', 'inviterName', 'joinUrl'] },
  { type: 'order_confirmation', name: 'Shop Order Confirmation / Receipt', trigger: 'Paid shop or Trick-or-Treat order confirmed', critical: true, defaultEnabled: true, vars: ['name', 'orderNumber', 'total', 'orderUrl'] },
  { type: 'order_shipped',     name: 'Shop Order Shipped',         trigger: 'Shop order marked shipped',      critical: false, defaultEnabled: true,  vars: ['name', 'orderNumber', 'carrier', 'trackingNumber', 'trackingUrl'] },
  { type: 'print_shipped',     name: 'Print Issue Shipped',        trigger: 'Print issue mailed to a subscriber', critical: false, defaultEnabled: true, vars: ['name', 'issueTitle', 'carrier', 'trackingNumber', 'eta', 'trackingUrl'] },
]

export const EMAIL_TYPE_MAP = Object.fromEntries(EMAIL_TYPES.map(t => [t.type, t]))
