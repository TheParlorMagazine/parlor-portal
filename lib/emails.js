import { deliver } from './sendEmail'

// Every email's HTML lives in a single builder below. Senders route the built
// HTML through deliver() (toggle gate + optional admin template override), and
// renderDefaultEmail() reuses the same builders to show the built-in design in
// the admin editor preview — so there is one source of truth per email.

const LOGO = 'https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png'
const SITE = 'https://theparlormagazine.com'

function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
const DIGEST_TYPE_LABEL = { reply: 'Reply', inbox: 'Message', library: 'Library', event: 'Event', new_thread: 'Discussion', system: 'The Parlor' }
function fmtEventWhen(startsAt) {
  if (!startsAt) return ''
  const d = new Date(startsAt)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Builders (return the full HTML body) ───────────────────────────────
function buildWelcome({ name } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;line-height:1.2;">
          Welcome to The Parlor, ${name || 'there'}.
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:24px;">
          We're glad you're here. The Parlor is a space for slow reading,
          critical thinking, and community — and you're now part of it.
        </p>
        <p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">
          Your account is ready. Head to your dashboard to explore the
          library, join the reading room, and see what's coming up.
        </p>
        <a href="${SITE}/portal"
          style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
          Go to your dashboard →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;line-height:1.6;">
            The Parlor Magazine ·
            <a href="https://www.theparlormagazine.com" style="color:#888;">theparlormagazine.com</a>
          </p>
        </div>
      </div>
    `
}

function buildWeeklyDigest({ name, notifications = [], unread = { count: 0, threads: [] }, siteUrl } = {}) {
  const base = siteUrl || SITE
  const notifRows = notifications.map(n => `
    <tr><td style="padding:11px 0;border-bottom:1px solid #f0e2e6;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#9a7580;margin-bottom:3px;">${esc(DIGEST_TYPE_LABEL[n.type] || 'The Parlor')}</div>
      <div style="font-size:14px;color:#333;line-height:1.5;">${esc(n.message)}</div>
    </td></tr>`).join('')
  const notifSection = notifications.length ? `
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin:34px 0 6px;">This week's notifications</div>
    <table width="100%" cellpadding="0" cellspacing="0">${notifRows}</table>
    <a href="${base}/portal/notifications" style="display:inline-block;margin-top:16px;background:#0a0a0a;color:#fff;padding:11px 24px;font-size:13px;font-weight:700;text-decoration:none;">View all notifications →</a>
  ` : ''
  const msgSection = unread.count ? `
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin:36px 0 6px;">Unread messages</div>
    <div style="font-size:14px;color:#333;line-height:1.6;">You have <strong>${unread.count}</strong> unread message${unread.count === 1 ? '' : 's'}${unread.threads.length ? ' in:' : '.'}</div>
    <ul style="padding-left:18px;margin:8px 0 0;">${(unread.threads || []).map(t => `<li style="margin-bottom:5px;font-size:14px;color:#333;">${esc(t.subject || 'Conversation')}</li>`).join('')}</ul>
    <a href="${base}/portal/inbox" style="display:inline-block;margin-top:16px;background:#0a0a0a;color:#fff;padding:11px 24px;font-size:13px;font-weight:700;text-decoration:none;">Open your inbox →</a>
  ` : ''
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:28px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:26px;font-weight:700;margin-bottom:8px;line-height:1.2;">The past two weeks at The Parlor${name ? `, ${esc(name)}` : ''}.</h1>
        <p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:8px;">Here's what you missed in the community these last two weeks.</p>
        ${notifSection}
        ${msgSection}
        <div style="margin-top:44px;padding-top:22px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;line-height:1.6;">The Parlor Magazine · <a href="https://www.theparlormagazine.com" style="color:#888;">theparlormagazine.com</a></p>
        </div>
      </div>
    `
}

function buildPasswordReset({ name, resetUrl } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;line-height:1.2;">
          Reset your password${name ? `, ${name}` : ''}.
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:24px;">
          We received a request to reset the password for your Parlor account.
          Click below to choose a new one. This link expires in one hour.
        </p>
        <a href="${resetUrl}"
          style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
          Reset my password →
        </a>
        <p style="font-size:14px;line-height:1.7;color:#888;margin-top:28px;">
          If you didn't request this, you can safely ignore this email — your
          password won't change.
        </p>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;line-height:1.6;">
            The Parlor Magazine ·
            <a href="https://www.theparlormagazine.com" style="color:#888;">theparlormagazine.com</a>
          </p>
        </div>
      </div>
    `
}

function buildPaymentConfirmed({ name, planName, amount } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;">
          You're in, ${name}.
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:16px;">
          Your <strong>${planName}</strong> membership is now active.
        </p>
        <div style="background:#fce8ef;border-left:3px solid #f2b8c6;padding:16px 20px;margin-bottom:28px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:6px;">
            Your plan
          </div>
          <div style="font-size:16px;font-weight:700;color:#0a0a0a;">${planName}</div>
          <div style="font-size:13px;color:#666;margin-top:4px;">$${amount}/month · renews automatically</div>
        </div>
        <p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">
          Head to your dashboard to access everything included in your membership.
        </p>
        <a href="${SITE}/portal"
          style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
          Go to your dashboard →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">
            Questions? Reply to this email or visit
            <a href="https://www.theparlormagazine.com" style="color:#888;">theparlormagazine.com</a>
          </p>
        </div>
      </div>
    `
}

function buildPlanUpgraded({ name, oldPlan, newPlan } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;">
          Upgrade confirmed, ${name}.
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:28px;">
          You've moved from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>.
          You've been credited for any unused time on your previous plan.
        </p>
        <a href="${SITE}/portal"
          style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          Go to your dashboard →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine</p>
        </div>
      </div>
    `
}

function buildPaymentFailed({ name, planName } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;">
          We couldn't process your payment
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:16px;">
          Hi ${name}, your payment for <strong>${planName}</strong> didn't go through.
        </p>
        <p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">
          Please update your payment details to keep your membership active.
          We'll try again in a few days.
        </p>
        <a href="${SITE}/portal"
          style="display:inline-block;background:#e07070;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          Update payment details →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">
            Need help? Reply to this email.
          </p>
        </div>
      </div>
    `
}

function buildCancellation({ name, planName } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;">
          Until next time, ${name}.
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:16px;">
          Your <strong>${planName}</strong> membership has been cancelled.
          You'll keep access until the end of your current billing period.
        </p>
        <p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">
          We'd love to have you back whenever you're ready.
          Your account and reading history will be here waiting.
        </p>
        <a href="${SITE}/plans"
          style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          Reactivate membership →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine</p>
        </div>
      </div>
    `
}

function buildEventRsvp({ name, title, when, where, eventUrl, siteUrl = SITE } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:28px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <p style="font-size:13px;color:#c47080;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin:0 0 8px;">You're on the list</p>
        <h1 style="font-size:26px;font-weight:700;margin:0 0 8px;line-height:1.2;">${title || 'A Parlor event'}</h1>
        ${when ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 4px;"><strong>When:</strong> ${when}</p>` : ''}
        <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;"><strong>Where:</strong> ${where || 'Online'}</p>
        <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 28px;">
          Thanks for RSVPing, ${name}. You now have access to the event discussion, and we'll send a reminder before it starts.
        </p>
        <a href="${eventUrl || siteUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          View the event →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine · <a href="${siteUrl}" style="color:#888;">theparlormagazine.com</a></p>
        </div>
      </div>
    `
}

function buildEventReminder({ name, title, when, eventUrl, siteUrl = SITE } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:28px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;line-height:1.2;">See you soon, ${name}.</h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin:0 0 6px;"><strong>${title || 'A Parlor event'}</strong></p>
        ${when ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;">${when}</p>` : ''}
        <a href="${eventUrl || siteUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          Join details →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine · <a href="${siteUrl}" style="color:#888;">theparlormagazine.com</a></p>
        </div>
      </div>
    `
}

function buildForumInvite({ forumName, inviterName, joinUrl, siteUrl = SITE } = {}) {
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:28px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <p style="font-size:13px;color:#c47080;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin:0 0 8px;">You're invited</p>
        <h1 style="font-size:25px;font-weight:700;margin:0 0 10px;line-height:1.2;">Join ${forumName || 'a forum'} on The Parlor</h1>
        <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 26px;">
          ${inviterName || 'A member of The Parlor'} invited you to join the <strong>${forumName || ''}</strong> forum. Create your free account (or sign in) to accept and start the conversation.
        </p>
        <a href="${joinUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          Accept invite →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine · <a href="${siteUrl}" style="color:#888;">theparlormagazine.com</a><br/>If you weren't expecting this, you can ignore it.</p>
        </div>
      </div>
    `
}

function buildPrintShipped({ name, issueTitle, carrier, trackingNumber, estimatedArrival, trackingUrl, siteUrl = SITE } = {}) {
  const eta = estimatedArrival
    ? new Date(estimatedArrival + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null
  const cta = trackingUrl
    ? `<a href="${trackingUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">Track your issue →</a>`
    : `<a href="${siteUrl}/portal/subscriptions" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">View delivery details →</a>`
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:28px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <p style="font-size:13px;color:#c47080;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin:0 0 8px;">In the mail</p>
        <h1 style="font-size:25px;font-weight:700;margin:0 0 12px;line-height:1.2;">${issueTitle || 'Your print issue'} has shipped</h1>
        <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 20px;">
          ${name ? esc(name) + ', your' : 'Your'} copy of The Parlor is on its way${eta ? `, and should arrive by <strong>${eta}</strong>` : ''}.
        </p>
        ${carrier || trackingNumber ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;">${carrier ? `<strong>Carrier:</strong> ${esc(carrier)}<br/>` : ''}${trackingNumber ? `<strong>Tracking:</strong> ${esc(trackingNumber)}` : ''}</p>` : ''}
        ${cta}
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine · <a href="${siteUrl}" style="color:#888;">theparlormagazine.com</a></p>
        </div>
      </div>
    `
}

function buildOrderShipped({ name, order, siteUrl = SITE } = {}) {
  const num = order?.order_number ? `Order ${order.order_number}` : 'Your order'
  const trackBtn = order?.tracking_url
    ? `<a href="${order.tracking_url}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">Track your shipment →</a>`
    : `<a href="${siteUrl}/portal/orders" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">View your order →</a>`
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:28px;">
          <img src="${LOGO}" width="48" height="48" style="border-radius:50%;" />
        </div>
        <p style="font-size:13px;color:#c47080;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin:0 0 8px;">On its way</p>
        <h1 style="font-size:25px;font-weight:700;margin:0 0 10px;line-height:1.2;">${num} has shipped</h1>
        <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 20px;">
          Good news${name ? `, ${esc(name)}` : ''} — your Parlor order is on the way.
        </p>
        ${order?.carrier || order?.tracking_number ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;">${order?.carrier ? `<strong>Carrier:</strong> ${esc(order.carrier)}<br/>` : ''}${order?.tracking_number ? `<strong>Tracking:</strong> ${esc(order.tracking_number)}` : ''}</p>` : ''}
        ${trackBtn}
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine · <a href="${siteUrl}" style="color:#888;">theparlormagazine.com</a></p>
        </div>
      </div>
    `
}

// Registry used to render the built-in design in the admin editor preview.
const BUILDERS = {
  welcome: buildWelcome,
  weekly_digest: buildWeeklyDigest,
  password_reset: buildPasswordReset,
  payment_confirmed: buildPaymentConfirmed,
  payment_failed: buildPaymentFailed,
  plan_upgraded: buildPlanUpgraded,
  cancellation: buildCancellation,
  event_rsvp: buildEventRsvp,
  event_reminder: buildEventReminder,
  forum_invite: buildForumInvite,
  order_shipped: buildOrderShipped,
  order_confirmation: buildOrderConfirmation,
  print_shipped: buildPrintShipped,
}
export function renderDefaultEmail(type, vars = {}) {
  const b = BUILDERS[type]
  return b ? b(vars) : ''
}

// ── Senders ────────────────────────────────────────────────────────────
export async function sendWelcomeEmail({ to, name }) {
  return deliver({ type: 'welcome', critical: false, vars: { name }, to, subject: 'Welcome to The Parlor', html: buildWelcome({ name }) })
}

export async function sendWeeklyDigestEmail({ to, name, notifications = [], unread = { count: 0, threads: [] }, siteUrl }) {
  return deliver({ type: 'weekly_digest', critical: false, vars: { name }, to, subject: 'The past two weeks at The Parlor', html: buildWeeklyDigest({ name, notifications, unread, siteUrl }) })
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  return deliver({ type: 'password_reset', critical: true, vars: { name, resetUrl }, to, subject: 'Reset your Parlor password', html: buildPasswordReset({ name, resetUrl }) })
}

export async function sendPaymentConfirmedEmail({ to, name, planName, amount }) {
  return deliver({ type: 'payment_confirmed', critical: true, vars: { name, planName, amount }, to, subject: `You're now a ${planName} member`, html: buildPaymentConfirmed({ name, planName, amount }) })
}

export async function sendPlanUpgradedEmail({ to, name, oldPlan, newPlan }) {
  return deliver({ type: 'plan_upgraded', critical: false, vars: { name, oldPlan, newPlan }, to, subject: `You've upgraded to ${newPlan}`, html: buildPlanUpgraded({ name, oldPlan, newPlan }) })
}

export async function sendPaymentFailedEmail({ to, name, planName }) {
  return deliver({ type: 'payment_failed', critical: true, vars: { name, planName }, to, subject: 'Action needed — payment failed', html: buildPaymentFailed({ name, planName }) })
}

export async function sendCancellationEmail({ to, name, planName }) {
  return deliver({ type: 'cancellation', critical: false, vars: { name, planName }, to, subject: 'Your membership has been cancelled', html: buildCancellation({ name, planName }) })
}

export async function sendEventRsvpEmail({ to, name, event, siteUrl = SITE }) {
  const when = fmtEventWhen(event?.starts_at)
  const where = event?.location_type === 'in_person' ? (event?.location || 'In person') : (event?.location || 'Online')
  const eventUrl = `${siteUrl}/portal/events/${event?.id || ''}`
  return deliver({ type: 'event_rsvp', critical: false, vars: { name, eventTitle: event?.title, eventWhen: when, eventWhere: where, eventUrl }, to, subject: `You're going: ${event?.title || 'a Parlor event'}`, html: buildEventRsvp({ name, title: event?.title, when, where, eventUrl, siteUrl }) })
}

export async function sendEventReminderEmail({ to, name, event, siteUrl = SITE }) {
  const when = fmtEventWhen(event?.starts_at)
  const eventUrl = `${siteUrl}/portal/events/${event?.id || ''}`
  return deliver({ type: 'event_reminder', critical: false, vars: { name, eventTitle: event?.title, eventWhen: when, eventUrl }, to, subject: `Reminder: ${event?.title || 'a Parlor event'} is coming up`, html: buildEventReminder({ name, title: event?.title, when, eventUrl, siteUrl }) })
}

export async function sendForumInviteEmail({ to, forumName, inviterName, joinUrl, siteUrl = SITE }) {
  return deliver({ type: 'forum_invite', critical: false, vars: { forumName, inviterName, joinUrl }, to, subject: `${inviterName || 'A Parlor member'} invited you to ${forumName || 'a forum'}`, html: buildForumInvite({ forumName, inviterName, joinUrl, siteUrl }) })
}

export async function sendPrintIssueShippedEmail({ to, name, issueTitle, carrier, trackingNumber, trackingUrl, estimatedArrival, siteUrl = SITE }) {
  return deliver({ type: 'print_shipped', critical: false, vars: { name, issueTitle, carrier, trackingNumber, eta: estimatedArrival, trackingUrl }, to, subject: `${issueTitle || 'Your issue'} is on its way`, html: buildPrintShipped({ name, issueTitle, carrier, trackingNumber, estimatedArrival, trackingUrl, siteUrl }) })
}

export async function sendOrderConfirmationEmail({ to, name, order, items = [], siteUrl = SITE }) {
  const num = order?.order_number ? `Order ${order.order_number}` : 'Your order'
  return deliver({ type: 'order_confirmation', critical: true, vars: { name, orderNumber: order?.order_number, total: order?.total_cents }, to, subject: `${num} confirmed — thank you!`, html: buildOrderConfirmation({ name, order, items, siteUrl }) })
}

function buildOrderConfirmation({ name, order, items = [], siteUrl = SITE } = {}) {
  const num = order?.order_number ? `Order ${order.order_number}` : 'Your order'
  const money = c => (c == null ? '' : `$${(c / 100).toFixed(2)}`)
  const rows = (items || []).map(it => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-family:Georgia,serif;font-size:14px;color:#0a0a0a;">${esc(it.product_name || 'Item')}${it.variant ? ` <span style="color:#888;">(${esc(it.variant)})</span>` : ''} × ${it.quantity || 1}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-family:Georgia,serif;font-size:14px;color:#0a0a0a;text-align:right;">${money((it.unit_price_cents || 0) * (it.quantity || 1))}</td>
        </tr>`).join('')
  return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:28px;"><img src="${LOGO}" width="48" height="48" style="border-radius:50%;" /></div>
        <p style="font-size:13px;color:#c47080;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin:0 0 8px;">Order confirmed</p>
        <h1 style="font-size:25px;font-weight:700;margin:0 0 10px;line-height:1.2;">Thank you${name ? `, ${esc(name)}` : ''}!</h1>
        <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 22px;">We've received your order${order?.order_number ? ` <strong>(${esc(order.order_number)})</strong>` : ''} and it's being prepared. You'll get another note with tracking once it ships.</p>
        ${rows ? `<table style="width:100%;border-collapse:collapse;margin:0 0 8px;"><tbody>${rows}</tbody></table>` : ''}
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;"><tbody>
          ${order?.subtotal_cents != null ? `<tr><td style="padding:4px 0;font-family:Georgia,serif;font-size:14px;color:#666;">Subtotal</td><td style="padding:4px 0;font-family:Georgia,serif;font-size:14px;color:#666;text-align:right;">${money(order.subtotal_cents)}</td></tr>` : ''}
          ${order?.shipping_cents != null ? `<tr><td style="padding:4px 0;font-family:Georgia,serif;font-size:14px;color:#666;">Shipping</td><td style="padding:4px 0;font-family:Georgia,serif;font-size:14px;color:#666;text-align:right;">${order.shipping_cents ? money(order.shipping_cents) : 'Free'}</td></tr>` : ''}
          ${order?.total_cents != null ? `<tr><td style="padding:8px 0 0;font-family:Georgia,serif;font-size:16px;font-weight:700;">Total</td><td style="padding:8px 0 0;font-family:Georgia,serif;font-size:16px;font-weight:700;text-align:right;">${money(order.total_cents)}</td></tr>` : ''}
        </tbody></table>
        ${order?.shipping_address ? `<p style="font-size:13px;line-height:1.6;color:#666;margin:0 0 24px;"><strong style="color:#0a0a0a;">Shipping to</strong><br/>${esc(order.shipping_name || '')}<br/>${esc(order.shipping_address).replace(/\n/g, '<br/>')}</p>` : ''}
        <a href="${siteUrl}/portal/orders" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">Track your order →</a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine · <a href="${siteUrl}" style="color:#888;">theparlormagazine.com</a></p>
        </div>
      </div>
    `
}

export async function sendOrderShippedEmail({ to, name, order, siteUrl = SITE }) {
  const num = order?.order_number ? `Order ${order.order_number}` : 'Your order'
  return deliver({ type: 'order_shipped', critical: false, vars: { name, orderNumber: order?.order_number, carrier: order?.carrier, trackingNumber: order?.tracking_number, trackingUrl: order?.tracking_url }, to, subject: `${num} has shipped`, html: buildOrderShipped({ name, order, siteUrl }) })
}
