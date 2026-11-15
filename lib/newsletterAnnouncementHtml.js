import { parseDocument } from 'htmlparser2'
import { campaignLinkUrl } from './campaignEmailStyles'
import { readAnnouncement } from './newsletterAnnouncement'
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const blocked = new Set(['script','style','iframe','object','svg','math','template'])
export function announcementRichHtml(value, renderImage = () => '') {
  function render(node) {
    if (node.type === 'text') return esc(node.data)
    const tag = node.name?.toLowerCase()
    if (blocked.has(tag)) return ''
    const children = (node.children || []).map(render).join('')
    if (tag === 'img' && node.attribs?.['data-announcement-image'] === '1') return renderImage(node.attribs)
    if (tag === 'br') return '<br>'
    if (['strong','b','em','i','u'].includes(tag)) return `<${tag}>${children}</${tag}>`
    if (tag === 'p' || tag === 'div') return `<p style="font-size:14px;line-height:1.6;color:#3d0a14;margin:0 0 10px;">${children}</p>`
    if (tag === 'a') {
      const href = campaignLinkUrl(node.attribs?.href)
      return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="color:#9b2945;text-decoration:underline;">${children}</a>` : children
    }
    return children
  }
  return parseDocument(String(value || '')).children.map(render).join('')
}
export function richAnnouncementBlock(value, titleHtml, imageUrl, title, destination, button) {
  const config = readAnnouncement(value)
  if (!config.rich) return null
  if (config.canvas) {
    let used = false
    const body = announcementRichHtml(config.html, attrs => {
      if (used || !imageUrl) return ''
      used = true
      const align = ['left','right'].includes(attrs['data-align']) ? attrs['data-align'] : 'full'
      const style = align === 'full' ? 'display:block;width:100%;height:auto;margin:0 0 12px;' : `float:${align};width:140px;max-width:40%;height:auto;margin:${align==='left'?'0 16px 10px 0':'0 0 10px 16px'};`
      const image = `<img src="${esc(imageUrl)}" alt="${esc(attrs.alt || title || 'Announcement')}" width="${align==='full'?'100%':'140'}" ${align==='full'?'':`align="${align}"`} style="${style}border:0;border-radius:6px;" />`
      return destination ? `<a href="${esc(destination)}" target="_blank" rel="noopener noreferrer">${image}</a>` : image
    })
    if (!title && !used && !body.replace(/<[^>]*>/g,'').trim()) return ''
    return `<div class="announcement-card" style="margin:0 0 28px;padding:12px;background:#fdf0f3;border-radius:8px;">${titleHtml}${body}<div style="clear:both;"></div>${button}</div>`
  }
  const body = announcementRichHtml(config.html)
  if (!title && !imageUrl && !body.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/g, ' ').trim()) return ''
  const thumb = config.layout === 'left' || config.layout === 'right'
  const image = imageUrl ? `<img src="${esc(imageUrl)}" alt="${esc(title || 'Announcement')}" ${thumb ? `width="140" align="${config.layout}" style="float:${config.layout};width:140px;max-width:40%;height:auto;margin:${config.layout === 'left' ? '0 16px 10px 0' : '0 0 10px 16px'};border:0;border-radius:6px;"` : 'width="100%" style="display:block;width:100%;height:auto;border:0;border-radius:6px;margin:0 0 12px;"'} />` : ''
  const visual = destination && image ? `<a href="${esc(destination)}" target="_blank" rel="noopener noreferrer">${image}</a>` : image
  let content
  if (config.layout === 'above') content = visual + titleHtml + body
  else if (config.layout === 'embedded') {
    const paragraphs = body.match(/<p\b[\s\S]*?<\/p>/g)
    if (paragraphs && paragraphs.join('') === body) { const split = Math.min(config.after, paragraphs.length); content = titleHtml + paragraphs.slice(0,split).join('') + visual + paragraphs.slice(split).join('') }
    else content = titleHtml + body + visual
  } else content = titleHtml + visual + body
  return `<div class="announcement-card" style="margin:0 0 28px;padding:12px;background:#fdf0f3;border-radius:8px;">${content}<div style="clear:both;"></div>${button}</div>`
}
