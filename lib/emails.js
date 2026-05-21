import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'The Parlor <onboarding@resend.dev>'
// When domain is connected, change to:
// 'The Parlor <hello@theparlormagazine.com>'

// ── Welcome email (sent on signup) ──
export async function sendWelcomeEmail({ to, name }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to The Parlor',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" 
            width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;line-height:1.2;">
          Welcome to The Parlor, ${name}.
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:24px;">
          We're glad you're here. The Parlor is a space for slow reading, 
          critical thinking, and community — and you're now part of it.
        </p>
        <p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">
          Your account is ready. Head to your dashboard to explore the 
          library, join the reading room, and see what's coming up.
        </p>
        <a href="https://parlor-portal.vercel.app/dashboard" 
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
  })
}

// ── Payment confirmed ──
export async function sendPaymentConfirmedEmail({ to, name, planName, amount }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `You're now a ${planName} member`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" 
            width="48" height="48" style="border-radius:50%;" />
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
        <a href="https://parlor-portal.vercel.app/dashboard" 
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
  })
}

// ── Plan upgraded ──
export async function sendPlanUpgradedEmail({ to, name, oldPlan, newPlan }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `You've upgraded to ${newPlan}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" 
            width="48" height="48" style="border-radius:50%;" />
        </div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:8px;">
          Upgrade confirmed, ${name}.
        </h1>
        <p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:28px;">
          You've moved from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>. 
          You've been credited for any unused time on your previous plan.
        </p>
        <a href="https://parlor-portal.vercel.app/dashboard" 
          style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          Go to your dashboard →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine</p>
        </div>
      </div>
    `
  })
}

// ── Payment failed ──
export async function sendPaymentFailedEmail({ to, name, planName }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Action needed — payment failed',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" 
            width="48" height="48" style="border-radius:50%;" />
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
        <a href="https://parlor-portal.vercel.app/dashboard" 
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
  })
}

// ── Cancellation ──
export async function sendCancellationEmail({ to, name, planName }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Your membership has been cancelled',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;">
        <div style="margin-bottom:32px;">
          <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" 
            width="48" height="48" style="border-radius:50%;" />
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
        <a href="https://parlor-portal.vercel.app/plans" 
          style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;">
          Reactivate membership →
        </a>
        <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;">
          <p style="font-size:12px;color:#888;">The Parlor Magazine</p>
        </div>
      </div>
    `
  })
}
