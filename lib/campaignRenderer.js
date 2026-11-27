import { campaignLinkUrl } from './campaignEmailStyles'

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

  let out = `<div${bg ? ' class="campaign-inset"' : ''} style="${pad}${bg}border-top:1px solid #f0f0f0;text-align:center">`

  if (b.image && b.type !== 'shop_grid' && b.type !== 'button') {
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

  const grid=b.shop_grid || (b.type === 'shop_grid' ? b : null)
  if (grid) {
    const currency=['usd','eur','gbp'].includes(grid.currency)?grid.currency:'usd'
    const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:currency.toUpperCase()}).format(value)
    const items=Array.isArray(grid.products)?grid.products.slice(0,12):[]
    const columns=grid.layout==='columns'?2:1
    const imageWidth=columns===1?480:240
    out += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed">'
    for(let i=0;i<items.length;i+=columns){
      out+='<tr>'
      for(const product of items.slice(i,i+columns)){
        const href=campaignLinkUrl(product.href),image=campaignLinkUrl(product.image),price=product.prices?.[currency]
        out+=`<td class="campaign-product-cell" width="${100/columns}%" valign="top" style="padding:12px 8px;text-align:left">`
        if(image&&/^https?:/.test(image)&&href)out+=`<a href="${esc(href)}"><img src="${esc(image)}" alt="${esc(product.name)}" width="${imageWidth}" style="width:100%;max-width:${imageWidth}px;height:auto;display:block;margin-bottom:12px;border-radius:4px;background-color:#ffffff"></a>`
        out+=`<h3 style="font-family:Georgia,serif;font-size:19px;line-height:1.3;margin:0 0 6px;color:${textColor}">${esc(product.name)}</h3>`
        if(product.variant)out+=`<p style="font-size:13px;margin:0 0 8px;color:${bodyColor}">${esc(product.variant)}</p>`
        if(price&&Number.isFinite(Number(price.amount))){
          const sale=Number(price.regular)>Number(price.amount)
          out+=`<p style="font-size:16px;margin:0 0 12px;color:${textColor}">${sale?`<s style="color:#888">${esc(money(price.regular))}</s> `:''}<span style="color:${sale?'#923c5a':textColor}">${esc(money(price.amount))}</span>${product.bundlePercent>0?` <span style="color:#923c5a;font-size:13px">${esc(product.bundlePercent)}% off the bundle</span>`:''}</p>`
        }
        if(href&&grid.product_cta_label)out+=`<a href="${esc(href)}" style="display:inline-block;padding:10px 16px;background:#0a0a0a;color:#fff;font-family:Georgia,serif;font-size:13px;text-decoration:none">${esc(grid.product_cta_label)}</a>`
        out+='</td>'
      }
      if(columns===2&&i+1===items.length)out+='<td class="campaign-product-cell" width="50%"></td>'
      out+='</tr>'
    }
    out+='</table>'
  }

  if (b.cta_label && campaignLinkUrl(b.cta_href)) {
    out += `<a href="${esc(campaignLinkUrl(b.cta_href))}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:11px 28px;background:#f2b8c6;color:#0a0a0a;font-family:'Source Serif 4',Georgia,serif;font-size:12px;font-weight:700;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase">${esc(b.cta_label)}</a>`
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

  let out = bg ? `<div class="campaign-inset" style="${bg}">` : ''

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