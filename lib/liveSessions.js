import { createHmac,randomUUID,timingSafeEqual } from 'node:crypto'
const key=()=>process.env.ACTIVE_SESSION_SECRET || process.env.NEWSLETTER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
const signature=value=>createHmac('sha256',key()).update('parlor-live-session:'+value).digest('base64url')
export function readLiveToken(value){
  try{
    if(!key() || typeof value!=='string')return null
    const [id,issued,sig,...extra]=value.split('.'),time=Number(issued)
    if(extra.length || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !Number.isSafeInteger(time) || time>Date.now()+60000 || time<Date.now()-86400000)return null
    const expected=signature(id+'.'+issued)
    return sig?.length===expected.length && timingSafeEqual(Buffer.from(sig),Buffer.from(expected))?{id,token:value}:null
  }catch{return null}
}
export function newLiveToken(instanceId = null){
  if(!key())throw Error('Live sessions are not configured.')
  let id=randomUUID()
  if(instanceId){
    const hex=createHmac('sha256',key()).update('parlor-live-instance:'+instanceId).digest('hex').slice(0,32).split('')
    hex[12]='4';hex[16]=((parseInt(hex[16],16)&3)|8).toString(16)
    const h=hex.join('');id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
  }
  const value=id+'.'+Date.now()
  return{id,token:value+'.'+signature(value)}
}
export function livePage(value,origin){
  try{
    if(typeof value!=='string' || value.length>2000)return null
    const url=new URL(value,origin)
    if(url.origin!==new URL(origin).origin || !['http:','https:'].includes(url.protocol))return null
    if(/^\/(?:admin|dashboard|api)(?:\/|$)/i.test(url.pathname))return null
    if(/^\/(?:auth|login|signup|logout|reset-password|forgot-password)(?:\/|$)/i.test(url.pathname))return 'Sign-in page'
    if(/^\/checkout(?:\/|$)/i.test(url.pathname))return 'Checkout'
    if(/^\/portal\/(?:inbox|messages)(?:\/|$)/i.test(url.pathname))return 'Private member page'
    return url.pathname.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,':id').slice(0,500)
  }catch{return null}
}
const clean=value=>typeof value==='string'?value.replace(/[\u0000-\u001f]/g,'').slice(0,100):null
export function liveLocation(request){
  // On Netlify this is the platform's IP-based location, not a browser claim.
  if(process.env.NETLIFY!=='true')return{country:null,region:null,city:null}
  try{
    const geo=JSON.parse(Buffer.from(request.headers.get('x-nf-geo') || '', 'base64').toString('utf8'))
    return{country:clean(geo.country?.name || geo.country?.code),region:clean(geo.subdivision?.name || geo.subdivision?.code || geo.region),city:clean(typeof geo.city==='string'?geo.city:geo.city?.name)}
  }catch{return{country:clean(request.headers.get('x-country')),region:null,city:null}}
}
