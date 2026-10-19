// Shared HTML rendering utilities for The Parlor emails

export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
export function blockToEmailHtml(b) {
  const bg = b.bg_color && b.bg_color !== '#ffffff'
    ? `background:${b.bg_color};`
    : ''

  const dark = b.bg_color &&
    ['#0a0a0a', '#1a1a2e', '#c4364a'].includes(b.bg_color)

  const textColor = dark ? '#fff' : '#0a0a0a'
  const bodyColor = dark ? 'rgba(255,255,255,0.8)' : '#444'
  const pad = bg ? 'padding:28px 24px;' : 'padding:28px 0;'

  let out = `<div style="${pad}${bg}border-top:1px solid #f0f0f0;text-align:center">`

  if (b.image) {
    out += `<img src="${esc(b.image)}" alt="" style="width:100%;max-width:600px;display:block;border-radius:6px;margin:0 auto 20px">`
  }

  if (b.eyebrow) {
    out += `<p style="font-family:'Source Serif 4',Georgia,serif;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:${dark ? '#f2b8c6' : '#7A263A'};margin:0 0 8px;font-weight:700">${esc(b.eyebrow)}</p>`
  }

  if (b.title) {
    out += `<h2 style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:${textColor};margin:0 0 12px;line-height:1.2">${esc(b.title)}</h2>`
  }

  if (b.body) {
    out += `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.75;color:${bodyColor};margin:0 0 20px">${b.body}</div>`
  }

  if (b.cta_label && b.cta_href) {
    out += `<a href="${esc(b.cta_href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:11px 28px;background:#f2b8c6;color:#0a0a0a;font-family:'Source Serif 4',Georgia,serif;font-size:12px;font-weight:700;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase">${esc(b.cta_label)}</a>`
  }

  out += `</div>`
  return out
}
export function processIntroForEmail(html) {
  return (html || '').replace(/<img([^>]*?)>/g, (match, attrs) => {
    const alignMatch = attrs.match(/data-align="([^"]+)"/)
    if (!alignMatch) return match

    const align = alignMatch[1]
    const widthMatch = attrs.match(/data-width="(\d+)"/)
    const w = widthMatch ? `${widthMatch[1]}%` : null

    const clean = attrs
      .replace(/\s*data-align="[^"]*"/, '')
      .replace(/\s*data-width="[^"]*"/, '')
      .replace(/\s*style="[^"]*"/, '')

    if (align === 'left')
      return `<img${clean} style="float:left;margin:4px 18px 12px 0;width:${w || '45%'};border-radius:5px">`

    if (align === 'right')
      return `<img${clean} style="float:right;margin:4px 0 12px 18px;width:${w || '45%'};border-radius:5px">`

    if (align === 'full')
      return `<img${clean} style="display:block;width:100%;border-radius:5px;clear:both">`

    return `<img${clean} style="display:block;margin:12px auto;width:${w || '60%'};border-radius:5px;clear:both">`
  })
}
export function blocksToEmailHtml(intro, blocks, introBg) {
  const bg = introBg && introBg !== '#ffffff'
    ? `background:${introBg};padding:20px 24px;`
    : ''

  let out = bg ? `<div style="${bg}">` : ''

  out += processIntroForEmail(intro)

  if (bg) out += `</div>`

  if (blocks.length) {
    out += `<div style="margin-top:24px">`

    for (const b of blocks) {
      out += blockToEmailHtml(b)
    }

    out += `</div>`
  }

  return out
}