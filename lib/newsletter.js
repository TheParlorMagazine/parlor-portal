// Builds The Parlor newsletter HTML from recent content. Sections auto-hide when
// empty. The per-recipient unsubscribe/preferences footer is appended at send
// time (see /api/emails/send-campaign), so it isn't included here.

const MARK = 'https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png'
const LOGO = 'https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png'
// TODO(link): set the real donation URL when it exists.
export const DONATE_URL = 'https://theparlormagazine.com/donate'

function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function fmtDay(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
function fmtWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function featuredBanner(ev, base) {
  if (!ev) return ''
  const cover = ev.cover_image_url
    ? `<img src="${ev.cover_image_url}" width="100%" style="display:block;width:100%;max-height:280px;object-fit:cover;" alt="" />`
    : ''
  const cta = ev.join_url || `${base}/portal/events/${ev.id}`
  return `
    <div style="background:#fce8ef;border-radius:10px;overflow:hidden;margin:0 0 32px;">
      ${cover}
      <div style="padding:22px 24px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#c4364a;font-weight:700;margin-bottom:8px;">Featured event</div>
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#0a0a0a;line-height:1.2;margin-bottom:6px;">${esc(ev.title)}</div>
        ${ev.starts_at ? `<div style="font-size:14px;color:#5a3a40;margin-bottom:4px;">${fmtWhen(ev.starts_at)}</div>` : ''}
        ${ev.blurb ? `<div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:16px;">${esc(ev.blurb)}</div>` : '<div style="height:12px;"></div>'}
        <a href="${cta}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:11px 24px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Register →</a>
      </div>
    </div>`
}

function articleCard(a, base) {
  const url = `${base}/post/${a.slug}`
  const cover = a.cover_image_url
    ? `<a href="${url}" target="_blank"><img src="${a.cover_image_url}" width="100%" style="display:block;width:100%;max-height:300px;object-fit:cover;border-radius:8px;" alt="" /></a>`
    : ''
  const excerpt = a.excerpt || a.subtitle || ''
  return `
    <div style="margin:0 0 30px;">
      ${cover}
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#0a0a0a;line-height:1.25;margin:14px 0 8px;">
        <a href="${url}" target="_blank" style="color:#0a0a0a;text-decoration:none;">${esc(a.title)}</a>
      </h2>
      ${excerpt ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 10px;">${esc(excerpt)}</p>` : ''}
      <a href="${url}" target="_blank" style="font-size:14px;font-weight:700;color:#7a2531;text-decoration:none;">Read here →</a>
    </div>`
}

// Print-issue promo block ("Issue N is finally here!") followed by the issue's
// rolled-out articles. Sits below the main articles.
function issueSection(issue, articles, base) {
  if (!issue) return ''
  const img = issue.newsletter_image || issue.cover_image_url
  const label = issue.number != null ? `Issue ${issue.number}` : issue.title
  const promoImg = img ? `<img src="${img}" width="100%" style="display:block;width:100%;border-radius:8px;margin:0 0 20px;" alt="" />` : ''
  const intro = issue.newsletter_intro ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 12px;">${esc(issue.newsletter_intro)}</p>` : ''
  const buyUrl = `${base}/issue/${issue.id}`
  const btn = 'display:inline-block;background:#0a0a0a;color:#fff;padding:12px 26px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:4px;'
  const arts = articles?.length
    ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:32px 0 18px;">From ${esc(label)} — <em style="text-transform:none;">${esc(issue.title)}</em></div>${articles.map(a => articleCard(a, base)).join('')}`
    : ''
  return `
    <div style="margin:40px 0 0;padding-top:34px;border-top:1px solid #eee;">
      ${promoImg}
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:25px;font-weight:700;color:#0a0a0a;line-height:1.2;margin:0 0 12px;">${esc(label)} is finally here!</h2>
      ${intro}
      <p style="font-size:14px;line-height:1.7;color:#777;margin:0 0 22px;">Original essays, reporting, and art — bound in print.</p>
      <div style="margin:0 0 6px;">
        <a href="${buyUrl}" style="${btn}">Buy the issue</a>
        <a href="${base}/plans" style="${btn}background:#fff;color:#0a0a0a;border:1px solid #0a0a0a;margin-left:8px;">Subscribe</a>
      </div>
      ${arts}
    </div>`
}

function otherEventsSection(events, base) {
  if (!events?.length) return ''
  const rows = events.map(ev => {
    const cta = ev.join_url || `${base}/portal/events/${ev.id}`
    return `
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0e2e6;">
        <div style="font-size:15px;font-weight:700;color:#0a0a0a;">${esc(ev.title)}</div>
        ${ev.starts_at ? `<div style="font-size:13px;color:#999;margin:2px 0 4px;">${fmtWhen(ev.starts_at)}</div>` : ''}
        <a href="${cta}" style="font-size:13px;font-weight:700;color:#7a2531;text-decoration:none;">Details →</a>
      </td></tr>`
  }).join('')
  return `
    <div style="margin:36px 0 0;">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:#0a0a0a;margin-bottom:8px;">Other events this month</div>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </div>`
}

function supportSection(base) {
  return `
    <div style="margin:40px 0 0;padding:24px;background:#faf7f8;border-radius:10px;">
      <div style="font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:8px;">💛 A note on where we are.</div>
      <p style="font-size:14.5px;line-height:1.7;color:#444;margin:0 0 16px;">
        The Parlor is still a startup, run by a small team with a lot of conviction. Everything you see here — the reporting, the platform, the print issues — is built scrappily and with care. If this work means something to you, the most direct way to support it is to become a subscriber or make a donation. It keeps the lights on.
      </p>
      <a href="${base}/plans" style="display:inline-block;background:#0a0a0a;color:#fff;padding:11px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;margin-right:8px;">Become a subscriber</a>
      <a href="${DONATE_URL}" style="display:inline-block;background:#fff;color:#0a0a0a;border:1px solid #0a0a0a;padding:11px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Make a donation</a>
    </div>`
}

// Returns { subject, html }. `intro` is an optional lead line.
export function buildNewsletter({ articles = [], issue = null, issueArticles = [], featuredEvent = null, otherEvents = [], intro = '', baseUrl = 'https://theparlormagazine.com' } = {}) {
  const base = baseUrl
  const subject = featuredEvent
    ? `The Parlor · ${featuredEvent.title}`
    : issue
      ? `The Parlor · ${issue.title}`
      : (articles[0]?.title ? `The Parlor · ${articles[0].title}` : 'This week at The Parlor')

  const html = `
    <div style="font-family:Georgia,'Source Serif 4',serif;max-width:600px;margin:0 auto;background:#fff;padding:0;color:#0a0a0a;">
      <div style="text-align:center;padding:26px 0 10px;">
        <img src="${MARK}" width="52" height="52" alt="" style="border-radius:50%;vertical-align:middle;display:inline-block;" />
        <img src="${LOGO}" alt="The Parlor" style="height:46px;object-fit:contain;vertical-align:middle;display:inline-block;margin-left:10px;" />
      </div>
      <div style="padding:8px 28px 28px;">
        ${intro ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;">${esc(intro)}</p>` : ''}
        ${featuredBanner(featuredEvent, base)}
        ${articles.length ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:0 0 18px;">Latest from The Parlor</div>` : ''}
        ${articles.map(a => articleCard(a, base)).join('')}
        ${issueSection(issue, issueArticles, base)}
        ${otherEventsSection(otherEvents, base)}
        ${supportSection(base)}
      </div>
    </div>`

  return { subject, html }
}
