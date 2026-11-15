const layouts = ['above', 'embedded', 'left', 'right']
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function readAnnouncement(value) {
  try {
    const data = JSON.parse(value)
    if (data?.kind === 'newsletter_announcement' && [1, 2].includes(data.version) && typeof data.html === 'string') return { rich: true, canvas: data.version === 2, html: data.html, layout: layouts.includes(data.layout) ? data.layout : 'above', after: Math.max(1, Math.min(100, Number(data.after) || 1)) }
  } catch {}
  return { rich: false, html: String(value || '').split(/\n\n+/).map(p=>`<p>${escape(p).replace(/\n/g,'<br>')}</p>`).join(''), layout: 'above', after: 1 }
}
export function writeAnnouncement(config) {
  return JSON.stringify({ kind: 'newsletter_announcement', version: config.canvas ? 2 : 1, html: config.html || '', layout: layouts.includes(config.layout) ? config.layout : 'above', after: Math.max(1, Math.min(100, Math.floor(Number(config.after) || 1))) })
}

// Upgrade old image placement into a single editable canvas node without changing copy.
export function announcementCanvas(config, image) {
  if (config.canvas || !image) return config.html
  const src = escape(image), align = ['left','right'].includes(config.layout) ? config.layout : 'full'
  const node = `<img src="${src}" data-announcement-image="1" data-align="${align}" alt="Announcement image">`
  if (config.layout === 'embedded') {
    let count = 0, inserted = false
    const html = config.html.replace(/<\/p>/gi, end => { count++; if (count === config.after) { inserted = true; return end + node } return end })
    return inserted ? html : html + node
  }
  return node + config.html
}
