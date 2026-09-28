// Shared constants for the Member Posts flow — kept in one place so the consent
// copy and the on-article disclaimer can be updated once and reflected
// everywhere (member form, approval handler, public renderer, publish gating).

// The four editorial verticals a member post can be filed under.
export const VERTICALS = ['Work & Wealth', 'Society & Culture', 'World & Politics', 'Perspectives & Identity']

// Bump when the consent language materially changes.
export const CONSENT_VERSION = '2026-09-27'

// Shown in the required submit-confirmation modal; consent_accepted_at +
// consent_version are stored when the member checks the box and submits.
export const MEMBER_POST_CONSENT = `I understand this is an unpaid member post, not a pitch for paid work. Once reviewed, it may be published in the member community space. I keep the rights to my writing and give The Parlor non-exclusive permission to display it. If editors select it for our verticals, they may edit and fact-check it, it may appear in the newsletter and Library, and I'll approve the final version before it publishes there. I can remove it at any time — but if it's already been published, including in the Library or digital archive, removing my post or deleting my account may not remove it from the archive; that stays at the editors' discretion.`

// Disclaimer that is auto-inserted as a distinct block at the top of every
// member-post article draft, and rendered at the top of the public article.
export const DISCLAIMER_TEXT = `This is a member post, written and shared by a Parlor member. Member posts are unpaid contributions. They're edited and fact-checked by our editors, but they aren't commissioned journalism.`

// TODO(link): point at the public "How member posts work" explainer once an
// About/contributor page exists. No such public route exists today.
export const HOW_MEMBER_POSTS_WORK_HREF = '/about/member-posts'
// TODO(link): public "pitch us for paid work" contributor page — none exists yet.
export const PITCH_HREF = '/contribute'

// The programmatic marker used to detect the disclaimer block in article HTML
// (publish gating) and to split it out when rendering.
export const DISCLAIMER_BLOCK_TYPE = 'disclaimer-block'
export const DISCLAIMER_MARKER = `data-type="${DISCLAIMER_BLOCK_TYPE}"`

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// The serialized TipTap block. Text lives in a data-attribute so it round-trips
// cleanly and stays editable/detectable.
export function disclaimerBlockHtml() {
  return `<div data-type="${DISCLAIMER_BLOCK_TYPE}" data-text="${escAttr(DISCLAIMER_TEXT)}"></div>`
}

// True if an article body already carries the disclaimer block.
export function hasDisclaimerBlock(html) {
  return typeof html === 'string' && html.includes(DISCLAIMER_MARKER)
}

// Prepend the disclaimer block to a body if it isn't already present.
export function withDisclaimer(html) {
  const body = html || ''
  return hasDisclaimerBlock(body) ? body : disclaimerBlockHtml() + '\n' + body
}
