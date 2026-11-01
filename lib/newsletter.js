import { campaignLinkUrl } from './campaignEmailStyles'
import { emailImageUrl } from './emailImages'

// Builds The Parlor newsletter HTML from recent content. Sections auto-hide when
// empty. The per-recipient unsubscribe/preferences footer is appended at send
// time (see /api/emails/send-campaign), so it isn't included here.

const MARK = 'https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png'
const LOGO = 'https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png'
// TODO(link): set the real donation URL when it exists.
export const DONATE_URL = 'https://theparlormagazine.com/buy-us-a-birthday-gift'

function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
// Converts pasted multi-paragraph text into email-safe HTML paragraphs.
function paragraphs(s, style = 'font-size:14.5px;line-height:1.7;color:#444;margin:0 0 14px;') {
  return String(s || '').split(/\n\n+/).map(p => `<p style="${style}">${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('')
}
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
  const cta = `${base}/portal/events/${ev.id}`
  return `
    <div style="background:#fce8ef;border-radius:10px;overflow:hidden;margin:0 0 32px;">
      ${cover}
      <div style="padding:22px 24px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#c4364a;font-weight:700;margin-bottom:8px;">Featured event</div>
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#0a0a0a;line-height:1.2;margin-bottom:6px;">${esc(ev.title)}</div>
        ${ev.starts_at ? `<div style="font-size:14px;color:#5a3a40;margin-bottom:4px;">${fmtWhen(ev.starts_at)}</div>` : ''}
        ${ev.blurb ? `<div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:16px;">${esc(ev.blurb)}</div>` : '<div style="height:12px;"></div>'}
        <a href="${cta}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0a0a0a;color:#fff;padding:11px 24px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Register →</a>
      </div>
    </div>`
}

function articleCard(a, base) {
  const url = `${base}/post/${a.slug}`
  const cover = a.cover_image_url
    ? `<div class="article-cover-wrap" style="margin:0 -12px;"><a href="${url}" target="_blank"><img src="${a.cover_image_url}" width="100%" class="article-cover-img" style="display:block;width:100%;height:320px;object-fit:cover;object-position:5% 15%;" alt="" /></a></div>`
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
  const sectionTitle = issue.newsletter_section_title || `${label} is finally here!`
  const intro = issue.newsletter_intro ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 12px;">${esc(issue.newsletter_intro)}</p>` : ''
  const tagline = (issue.newsletter_tagline || 'Original essays, reporting, and art — bound in print.')
  const btn1Label = issue.newsletter_button_copy || 'Buy the issue'
  const btn1Url = campaignLinkUrl(issue.newsletter_button_url) || `${base}/issue/${issue.id}`
  // Generate an actually opaque email image for public Supabase/Cloudinary art;
  // CSS backgrounds alone do not protect transparency in Gmail. Keep the
  // original asset untouched and make the image a link to the purchase page.
  // Linked images also avoid Gmail's download overlay in many inbox views,
  // although email recipients can always save images they receive.
  const promoImg = img ? `<a href="${esc(btn1Url)}" target="_blank" rel="noopener noreferrer" style="display:block;margin:0 0 10px;background:#ffffff;border-radius:8px;text-decoration:none;"><img src="${esc(emailImageUrl(img))}" width="100%" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px;background-color:#ffffff;" alt="${esc(label)} print edition" /></a>` : ''
  const btn2Label = issue.newsletter_button2_copy || 'Subscribe'
  const btn2Url = campaignLinkUrl(issue.newsletter_button2_url) || `${base}/plans`
  const btn = 'display:block;text-align:center;margin-bottom:10px;background:#0a0a0a;color:#fff;padding:12px 26px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:4px;'
  const arts = articles?.length
    ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:32px 0 18px;">From ${esc(label)} — <em style="text-transform:none;">${esc(issue.title)}</em></div>${articles.map(a => articleCard(a, base)).join('')}`
    : ''
  return `
    <div style="margin:40px 0 0;padding-top:34px;border-top:1px solid #eee;">
      <div class="issue-inset" style="background:#fff;border-radius:12px;padding:16px 12px;">
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:25px;font-weight:700;color:#0a0a0a;line-height:1.2;margin:0 0 16px;">${esc(sectionTitle)}</h2>
        ${promoImg}
        ${intro}
        <p style="font-size:14px;line-height:1.7;color:#7a4a55;margin:0 0 22px;">${esc(tagline)}</p>
        <div class="issue-btns" style="margin:0 0 6px;">
          <a href="${esc(btn1Url)}" target="_blank" rel="noopener noreferrer" class="issue-btn" style="${btn}">${esc(btn1Label)}</a>
          <a href="${esc(btn2Url)}" target="_blank" rel="noopener noreferrer" class="issue-btn" style="${btn}background:#fff;color:#0a0a0a;border:1px solid #0a0a0a;margin-left:0;">${esc(btn2Label)}</a>
        </div>
      </div>
      ${arts}
    </div>`
}

function otherEventsSection(events, base) {
  if (!events?.length) return ''
  const rows = events.map(ev => {
    const cta = `${base}/portal/events/${ev.id}`
    return `
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0e2e6;">
        <div style="font-size:15px;font-weight:700;color:#0a0a0a;">${esc(ev.title)}</div>
        ${ev.starts_at ? `<div style="font-size:13px;color:#999;margin:2px 0 4px;">${fmtWhen(ev.starts_at)}</div>` : ''}
        <a href="${cta}" target="_blank" rel="noopener noreferrer" style="font-size:13px;font-weight:700;color:#7a2531;text-decoration:none;">Details →</a>
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
    const url = campaignLinkUrl(p.external_url) || `${base}/shop/${p.id}`
    const img = p.images?.[0]
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:block;background:#ffffff;"><img src="${esc(emailImageUrl(p.images[0]))}" width="100%" style="display:block;width:100%;max-height:260px;object-fit:cover;border:0;border-radius:8px 8px 0 0;background-color:#ffffff;" alt="${esc(p.name)}" /></a>`
      : ''
    const price = p.price != null ? `$${Number(p.price).toFixed(2)}` : ''
    return `
      <div class="newsletter-card" style="margin:40px 0 0;padding:12px;background:#fdf0f3;border-radius:12px;">
        ${eyebrow}
        <div style="border:1px solid #f0d8de;border-radius:10px;overflow:hidden;">
          ${img}
          <div style="padding:18px 20px;">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#0a0a0a;line-height:1.2;margin-bottom:14px;">${esc(p.name)}${p.variant ? ` <span style="font-size:14px;font-weight:400;color:#888;">— ${esc(p.variant)}</span>` : ''}</div>
            <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Shop now${price ? ` — ${price}` : ''}</a>
          </div>
        </div>
      </div>`
  }

  const cols = products.map(p => {
    const url = campaignLinkUrl(p.external_url) || `${base}/shop/${p.id}`
    const img = p.images?.[0]
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:block;margin-bottom:10px;background:#ffffff;border-radius:6px;"><img src="${esc(emailImageUrl(p.images[0]))}" width="100%" class="shop-grid-image" style="display:block;width:100%;height:auto;max-height:280px;object-fit:contain;border:0;border-radius:6px;background-color:#ffffff;" alt="${esc(p.name)}" /></a>`
      : `<div style="width:100%;height:160px;background:#f5f5f5;border-radius:6px;margin-bottom:10px;"></div>`
    const price = p.price != null ? `<div style="font-size:13px;color:#888;margin:2px 0 10px;">$${Number(p.price).toFixed(2)}</div>` : ''
    return `
      <div class="shop-col" style="display:block;padding:0 0 20px;vertical-align:top;width:100%;box-sizing:border-box;">
        ${img}
        <div style="font-size:13.5px;font-weight:700;color:#0a0a0a;line-height:1.3;margin-bottom:2px;">${esc(p.name)}${p.variant ? ` — ${esc(p.variant)}` : ''}</div>
        ${price}
        <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-size:12.5px;font-weight:700;color:#fff;background:#0a0a0a;padding:7px 14px;border-radius:5px;text-decoration:none;">Shop →</a>
      </div>`
  }).join('')

  return `
    <div class="newsletter-card" style="margin:40px 0 0;padding:12px;background:#fdf0f3;border-radius:12px;">
      ${eyebrow}
      <div class="shop-table" style="width:100%;"><div class="shop-row shop-row--${count}">${cols}</div></div>
    </div>`
}

function announcementBlock(title, text, url, img, btnCopy) {
  if (!text && !title) return ''
  const destination = campaignLinkUrl(url)
  const image = img ? `<img src="${esc(emailImageUrl(img, 'fdf0f3'))}" width="100%" class="ann-img" style="display:block;width:100%;height:auto;max-height:240px;object-fit:contain;border:0;border-radius:6px;background-color:#fdf0f3;" alt="${esc(title || 'Announcement')}" />` : ''
  const linkedImage = destination ? `<a href="${esc(destination)}" target="_blank" rel="noopener noreferrer" style="display:block;background:#fdf0f3;border-radius:6px;">${image}</a>` : image
  const btnLabel = (btnCopy || 'Learn more') + ' →'
  const btn = destination
    ? `<div style="margin-top:12px;"><a href="${esc(destination)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0a0a0a;color:#fff;padding:9px 20px;font-family:Georgia,serif;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">${esc(btnLabel)}</a></div>`
    : ''
  const titleHtml = title ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:700;color:#0a0a0a;margin-bottom:6px;line-height:1.3;">${esc(title)}</div>` : ''

  if (img) {
    return `
    <div class="announcement-card" style="margin:0 0 28px;padding:12px;background:#fdf0f3;border-radius:8px;">
      <div class="ann-table" style="display:block;width:100%;">
          <div class="ann-img-cell" style="display:block;width:100%;padding:0 0 12px;box-sizing:border-box;">
            ${linkedImage}
          </div>
          <div class="ann-body-cell" style="display:block;width:100%;">
            ${titleHtml}
            ${text ? paragraphs(text, 'font-size:14px;line-height:1.6;color:#3d0a14;margin:0 0 10px;') : ''}
            ${btn}
          </div>
      </div>
    </div>`
  }

  return `
    <div class="announcement-card" style="margin:0 0 28px;padding:12px;background:#fdf0f3;border-radius:8px;">
      ${titleHtml}
      ${text ? paragraphs(text, 'font-size:14px;line-height:1.6;color:#3d0a14;margin:0 0 10px;') : ''}
      ${btn}
    </div>`
}

function supportSection(copy, base, title, btn1, btn2) {
  const body = copy || 'The Parlor is still a startup, run by a small team with a lot of conviction. Everything you see here — the reporting, the platform, the print issues — is built scrappily and with care. If this work means something to you, the most direct way to support it is to become a subscriber or make a donation. It keeps the lights on.'
  const heading = title || '💛 A note on where we are.'
  const label1 = btn1 || 'Become a subscriber'
  const label2 = btn2 || 'Make a donation'
  return `
    <div class="newsletter-card" style="margin:40px 0 0;padding:12px;background:#fdf0f3;border-radius:10px;">
      <div style="font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:8px;">${esc(heading)}</div>
      ${paragraphs(body)}
      <div class="issue-btns" style="margin-top:4px;">
        <a href="${base}/plans" target="_blank" rel="noopener noreferrer" class="issue-btn" style="display:block;text-align:center;margin-bottom:10px;background:#0a0a0a;color:#fff;padding:11px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">${esc(label1)}</a>
        <a href="${DONATE_URL}" target="_blank" rel="noopener noreferrer" class="issue-btn" style="display:block;text-align:center;margin-bottom:10px;background:#fff;color:#0a0a0a;border:1px solid #0a0a0a;padding:11px 22px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">${esc(label2)}</a>
      </div>
    </div>`
}

// Returns { subject, html }. `intro` is an optional lead line.
export function buildNewsletter({ articles = [], issue = null, issueArticles = [], featuredEvent = null, otherEvents = [], shopProducts = [], intro = '', sections = {}, supportCopy = '', supportTitle = '', supportBtn1 = '', supportBtn2 = '' } = {}) {
  // Inbox links always target the public site, even from deployment previews
  // or installations with an outdated NEXT_PUBLIC_SITE_URL value.
  const base = 'https://theparlormagazine.com'

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
  const announcementTitle      = show.announcement ? (issue?.newsletter_announcement_title || '') : ''
  const announcementText       = show.announcement ? (issue?.newsletter_announcement || '') : ''
  const announcementUrl        = show.announcement ? (issue?.newsletter_announcement_url || '') : ''
  const announcementImg        = show.announcement ? (issue?.newsletter_announcement_img || '') : ''
  const announcementBtn        = show.announcement ? (issue?.newsletter_announcement_btn || '') : ''

  const subject = effectiveFeatured
    ? `The Parlor · ${effectiveFeatured.title}`
    : effectiveIssue
      ? `The Parlor · ${effectiveIssue.title}`
      : (effectiveArticles[0]?.title ? `The Parlor · ${effectiveArticles[0].title}` : 'This week at The Parlor')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      /* Inline defaults stack on mobile and in clients that strip styles. */
      @media screen and (min-width: 481px) and (min-device-width: 481px) {
        .newsletter-document { margin:8px !important; }
        .shop-table { margin:0 -6px !important; width:calc(100% + 12px) !important; }
        .newsletter-body { padding:8px 28px 28px !important; }
        .newsletter-card { padding:24px !important; }
        .issue-inset { padding:20px 24px 24px !important; }
        .announcement-card { padding:16px 18px !important; }
        .ann-table { display:table !important; width:100% !important; }
        .ann-img-cell { display:table-cell !important; vertical-align:top !important; width:90px !important; padding:0 16px 0 0 !important; box-sizing:content-box !important; }
        .ann-body-cell { display:table-cell !important; vertical-align:top !important; width:auto !important; }
        .ann-img { width:90px !important; height:90px !important; object-fit:cover !important; }
        .shop-row { display:table !important; table-layout:fixed !important; width:100% !important; }
        .shop-col { display:table-cell !important; width:33.333% !important; padding:0 6px !important; }
        .shop-row--2 .shop-col { width:50% !important; }
        .shop-grid-image { height:160px !important; object-fit:cover !important; }
        .issue-btn { display:inline-block !important; margin-right:8px !important; margin-bottom:0 !important; }
        .article-cover-wrap { margin:0 -28px !important; }
        .article-cover-img { height:520px !important; }
      }
      @media screen and (max-width:480px) {
        .article-cover-img { height:320px !important; }
      }
    </style>
</head><body class="newsletter-document" style="margin:0;padding:0;background:#ffffff;">
    <div style="font-family:Georgia,'Source Serif 4',serif;max-width:600px;margin:0 auto;background:#fff;padding:0;color:#0a0a0a;">
      <div style="text-align:center;padding:36px 0 16px;">
        <img src="${MARK}" width="72" height="72" alt="" style="border-radius:50%;vertical-align:middle;display:inline-block;" />
        <img src="${LOGO}" alt="The Parlor" style="height:90px;object-fit:contain;vertical-align:middle;display:inline-block;margin-left:14px;" />
      </div>
      <div class="newsletter-body" style="padding:8px 12px 24px;">
        ${intro ? `<p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;">${esc(intro)}</p>` : ''}
        ${announcementBlock(announcementTitle, announcementText, announcementUrl, announcementImg, announcementBtn)}
        ${featuredBanner(effectiveFeatured, base)}
        ${effectiveArticles.length ? `<div style="font-family:'Playfair Display',Georgia,serif;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:0 0 18px;">Latest from The Parlor</div>` : ''}
        ${effectiveArticles.map(a => articleCard(a, base)).join('')}
        ${effectiveShopProducts.length ? shopAdBlock(effectiveShopProducts, base) : ''}
        ${issueSection(effectiveIssue, effectiveIssueArticles, base)}
        ${otherEventsSection(effectiveOther, base)}
        ${show.support ? supportSection(supportCopy, base, supportTitle, supportBtn1, supportBtn2) : ''}
      </div>
    </div>
</body></html>`

  return { subject, html }
}
