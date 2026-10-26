// Email clients often strip head CSS and flatten transparent artwork onto black.
// Use explicit inline link styles and background-composited Cloudinary derivatives.
function attribute(tag, name) {
  const match=tag.match(new RegExp('\\s'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','i'))
  return match?.[2] || ''
}
function styled(tag, additions) {
  const style=attribute(tag,'style')
  const clean=style.replace(/(?:^|;)\s*color\s*:[^;]*/gi,'')
  const value=clean.replace(/;?\s*$/,';')+additions
  return /\sstyle\s*=/i.test(tag)
    ? tag.replace(/\sstyle\s*=\s*(["'])(.*?)\1/i,` style="${value}"`)
    : tag.replace(/\s*\/?>$/,ending=>` style="${value}"${ending}`)
}
export function campaignImageUrl(value, background='ffffff') {
  try {
    const url=new URL(value.replace(/&amp;/g,'&'))
    if(url.protocol!=='https:' || url.hostname!=='res.cloudinary.com' || !url.pathname.includes('/image/upload/'))return value
    // Do not freeze animated promotional GIFs into a single frame.
    const format=/\.gif$/i.test(url.pathname)?'gif':'jpg'
    const color=/^[0-9a-f]{6}$/i.test(background)?background:'ffffff'
    url.pathname=url.pathname.replace('/image/upload/',`/image/upload/b_rgb:${color},f_${format}/`)
    return url.toString().replace(/&/g,'&amp;')
  }catch{return value}
}
export function styleCampaignContent(html) {
  // Preserve the campaign builder's JSON comments exactly as saved.
  return String(html || '').split(/(<!--[\s\S]*?-->)/g).map(part=>{
    if(part.startsWith('<!--'))return part
    return part.replace(/<div\b[^>]*>/gi,tag=>{
      // Saved campaigns predate the responsive class; upgrade their known insets too.
      const style=attribute(tag,'style')
      if(!/padding\s*:\s*(?:28px|20px)\s+24px\s*;/i.test(style) || !/background(?:-color)?\s*:/i.test(style))return tag
      const classes=attribute(tag,'class')
      if(classes.split(/\s+/).includes('campaign-inset'))return tag
      return classes?tag.replace(/\sclass\s*=\s*(["'])(.*?)\1/i,` class="${classes} campaign-inset"`):tag.replace(/>$/, ' class="campaign-inset">')
    }).replace(/<a\b[^>]*>/gi,tag=>{
      if(/(?:^|;)\s*background(?:-color)?\s*:/i.test(attribute(tag,'style')))return tag
      return styled(tag,'color:#7A263A !important;')
    }).replace(/<img\b[^>]*>/gi,tag=>{
      const src=attribute(tag,'src')
      const replacement=campaignImageUrl(src)
      const image=src?tag.replace(/\ssrc\s*=\s*(["'])(.*?)\1/i,` src="${replacement}"`):tag
      // Preserve all existing sizing/alignment declarations and explicit colors.
      const style=attribute(image,'style')
      const additions=`${/height\s*:/i.test(style)?'':'height:auto;'}max-width:100%;${/background(?:-color)?\s*:/i.test(style)?'':'background-color:#ffffff;'}`
      return /\sstyle\s*=/i.test(image)?image.replace(/\sstyle\s*=\s*(["'])(.*?)\1/i,` style="${style};${additions}"`):image.replace(/\s*\/?>$/,ending=>` style="${additions}"${ending}`)
    })
  }).join('')
}
