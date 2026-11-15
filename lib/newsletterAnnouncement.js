const layouts = ['above', 'embedded', 'left', 'right']
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function readAnnouncement(value) {
  try {
    const data = JSON.parse(value)
    if (data?.kind === 'newsletter_announcement' && data.version === 1 && typeof data.html === 'string') return { rich: true, html: data.html, layout: layouts.includes(data.layout) ? data.layout : 'above', after: Math.max(1, Math.min(100, Number(data.after) || 1)) }
  } catch {}
  return { rich: false, html: String(value || '').split(/\n\n+/).map(p=>`<p>${escape(p).replace(/\n/g,'<br>')}</p>`).join(''), layout: 'above', after: 1 }
}
export function writeAnnouncement(config) {
  return JSON.stringify({ kind: 'newsletter_announcement', version: 1, html: config.html || '', layout: layouts.includes(config.layout) ? config.layout : 'above', after: Math.max(1, Math.min(100, Math.floor(Number(config.after) || 1))) })
}
