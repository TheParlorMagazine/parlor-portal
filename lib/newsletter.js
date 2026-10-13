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
  const tagline = (issue.newsletter_tagline || 'Original essays, reporting, and art — bound in print.')
  const buyUrl = `${base}/issue/${issue.id}`
  const btn = 'display:inline-block;background:#0a0a0a;color:#fff;padding:12px 26px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:4px;'
  const arts = articles?.length
    ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:32px 0 18px;">From ${esc(label)} — <em style="text-transform:none;">${esc(issue.title)}</em></div>${articles.map(a => articleCard(a, base)).join('')}`
    : ''
  return `
    <div style="margin:40px 0 0;padding-top:34px;border-top:1px solid #eee;">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:25px;font-weight:700;color:#0a0a0a;line-height:1.2;margin:0 0 16px;">${esc(label)} is finally here!</h2>
      ${promoImg}
      ${intro}
      <p style="font-size:14px;line-height:1.7;color:#777;margin:0 0 22px;">${esc(tagline)}</p>
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

function shopAdBlock(products, base) {
  if (!products?.length) return ''
  const count = products.length
  const eyebrow = `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:#c4364a;font-weight:700;margin-bottom:14px;">From the shop</div>`

  if (count === 1) {
    const p = products[0]
    const img = p.images?.[0]
      ? `<img src="${p.images[0]}" width="100%" style="display:block;width:100%;max-height:260px;object-fit:cover;border-radius:8px 8px 0 0;" alt="" />`
      : ''
    const price = p.price != null ? `$${Number(p.price).toFixed(2)}` : ''
    const url = p.external_url || `${base}/shop/${p.id}`
    return `
      <div style="margin:32px 0;">
        ${eyebrow}
        <div style="border:1px solid #e8e8e8;border-radius:10px;overflow:hidden;">
          ${img}
          <div style="padding:18px 20px;">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#0a0a0a;line-height:1.2;margin-bottom:14px;">${esc(p.name)}${p.variant ? ` <span style="font-size:14px;font-weight:400;color:#888;">— ${esc(p.variant)}</span>` : ''}</div>
            <a href="${url}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Shop now${price ? ` — ${price}` : ''}</a>
          </div>
        </div>
      </div>`
  }

  const cols = products.map(p => {
    const img = p.images?.[0]
      ? `<img src="${p.images[0]}" width="100%" style="display:block;width:100%;height:160px;object-fit:cover;border-radius:6px;margin-bottom:10px;" alt="" />`
      : `<div style="width:100%;height:160px;background:#f5f5f5;border-radius:6px;margin-bottom:10px;"></div>`
    const price = p.price != null ? `<div style="font-size:13px;color:#888;margin:2px 0 10px;">$${Number(p.price).toFixed(2)}</div>` : ''
    const url = p.external_url || `${base}/shop/${p.id}`
    return `
      <td style="padding:0 6px;vertical-align:top;width:${count === 2 ? '50' : '33'}%;">
        ${img}
        <div style="font-size:13.5px;font-weight:700;color:#0a0a0a;line-height:1.3;margin-bottom:2px;">${esc(p.name)}${p.variant ? ` — ${esc(p.variant)}` : ''}</div>
        ${price}
        <a href="${url}" style="display:inline-block;font-size:12.5px;font-weight:700;color:#fff;background:#0a0a0a;padding:7px 14px;border-radius:5px;text-decoration:none;">Shop →</a>
      </td>`
  }).join('')

  return `
    <div style="margin:32px 0;">
      ${eyebrow}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px;width:calc(100% + 12px);">
        <tr>${cols}</tr>
      </table>
    </div>`
}

function announcementBlock(text, url) {
  if (!text) return ''
  const btn = url
    ? `<div style="margin-top:14px;"><a href="${esc(url)}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Learn more →</a></div>`
    : ''
  return `
    <div style="margin:0 0 28px;padding:20px 22px;background:#fce8ef;border-left:4px solid #c4364a;border-radius:8px;">
      <p style="font-size:15px;line-height:1.7;color:#3d0a14;margin:0;">${esc(text)}</p>
      ${btn}
    </div>`
}

function supportSection(copy, base) {
  const body = copy || 'The Parlor is still a startup, run by a small team with a lot of conviction. Everything you see here — the reporting, the platform, the print issues — is built scrappily and with care. If this work means something to you, the most direct way to support it is to become a subscriber or make a donation. It keeps the lights on.'
  return `
    <div style="margin:40px 0 0;padding:24px;background:#faf7f8;border-radius:10px;">
      <div style="font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:8px;">💛 A note on where we are.</div>
      <p style="font-size:14.5px;line-height:1.7;color:#444;margin:0 0 16px;">${esc(body)}</p>
      <a href="${base}/plans" style="display:inline-block;background:#0a0a0a;color:#fff;padding:11px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;margin-right:8px;">Become a subscriber</a>
      <a href="${DONATE_URL}" style="display:inline-block;background:#fff;color:#0a0a0a;border:1px solid #0a0a0a;padding:11px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Make a donation</a>
    </div>`
}

// Returns { subject, html }. `intro` is an optional lead line.
export function buildNewsletter({ articles = [], issue = null, issueArticles = [], featuredEvent = null, otherEvents = [], shopProducts = [], intro = '', baseUrl = 'https://theparlormagazine.com', sections = {}, supportCopy = '' } = {}) {
  const base = baseUrl

  // Section visibility — all on by default
  const show = {
    announcement:  sections.announcement  !== false,
    issuPromo:     sections.issuPromo     !== false,
    issueArticles: sections.issueArticles !== false,
    articles:      sections.articles      !== false,
    featuredEvent: sections.featuredEvent !== false,
    otherEvents:   sections.otherEvents   !== false,
    shopAd:        sections.shopAd        !== false,
    support:       sections.support       !== false,
  }

  const effectiveFeatured      = show.featuredEvent ? featuredEvent : null
  const effectiveArticles      = show.articles ? articles : []
  const effectiveIssue         = show.issuPromo ? issue : null
  const effectiveIssueArticles = show.issueArticles ? issueArticles : []
  const effectiveOther         = show.otherEvents ? otherEvents : []
  const effectiveShopProducts  = show.shopAd ? shopProducts : []
  const announcementText       = show.announcement ? (issue?.newsletter_announcement || '') : ''
  const announcementUrl        = show.announcement ? (issue?.newsletter_announcement_url || '') : ''

  const subject = effectiveFeatured
    ? `The Parlor · ${effectiveFeatured.title}`
    : effectiveIssue
      ? `The Parlor · ${effectiveIssue.title}`
      : (effectiveArticles[0]?.title ? `The Parlor · ${effectiveArticles[0].title}` : 'This week at The Parlor')

  const html = `
    <div style="font-family:Georgia,'Source Serif 4',serif;max-width:600px;margin:0 auto;background:#fff;padding:0;color:#0a0a0a;">
      <div style="text-align:center;padding:26px 0 10px;">
        <img src="${MARK}" width="52" height="52" alt="" style="border-radius:50%;vertical-align:middle;display:inline-block;" />
        <img src="${LOGO}" alt="The Parlor" style="height:46px;object-fit:contain;vertical-align:middle;display:inline-block;margin-left:10px;" />
      </div>
      <div style="padding:8px 28px 28px;">
        ${intro ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;">${esc(intro)}</p>` : ''}
        ${announcementBlock(announcementText, announcementUrl)}
        ${featuredBanner(effectiveFeatured, base)}
        ${effectiveArticles.length ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:0 0 18px;">Latest from The Parlor</div>` : ''}
        ${effectiveArticles.map(a => articleCard(a, base)).join('')}
        ${issueSection(effectiveIssue, effectiveIssueArticles, base)}
        ${effectiveShopProducts.length ? shopAdBlock(effectiveShopProducts, base) : ''}
        ${otherEventsSection(effectiveOther, base)}
        ${show.support ? supportSection(supportCopy, base) : ''}
      </div>
    </div>`

  return { subject, html }
}
