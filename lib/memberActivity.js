// Keep activity metadata free of auth tokens, search terms and private messages.
export function activityPath(value, origin) {
  if(typeof value!=='string' || !value)return null
  try {
    const url=new URL(value,origin)
    if(url.origin!==new URL(origin).origin || !['http:','https:'].includes(url.protocol))return null
    const path=url.pathname
    if(/^\/(?:admin|dashboard|api|auth|login|signup|logout|checkout|reset-password|forgot-password)(?:\/|$)/i.test(path) || /^\/portal\/(?:inbox|messages)(?:\/|$)/i.test(path))return null
    return path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,':id').slice(0,500)
  }catch{return null}
}
export function activityTarget(value,origin) {
  if(typeof value!=='string')return null
  if(/^action:(?:checkout|add-to-cart|subscribe|save|join|purchase|wishlist)$/.test(value))return value
  try {
    const url=new URL(value,origin)
    if(!['http:','https:'].includes(url.protocol))return null
    if(url.origin===new URL(origin).origin)return activityPath(value,origin)
    return `${url.origin}${url.pathname}`.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,':id').slice(0,500)
  }catch{return null}
}
