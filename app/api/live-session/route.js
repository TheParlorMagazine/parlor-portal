import { serviceClient } from '../../../lib/apiAuth'
import { requireShopUser } from '../../../lib/shopAuth'
import { checkoutOrigin } from '../../../lib/checkoutOrigin'
import { readLiveToken,newLiveToken,livePage,liveLocation } from '../../../lib/liveSessions'
export const runtime='nodejs'
export async function POST(request){
  let body;try{const raw=await request.text();if(raw.length>8192)return Response.json({error:'Request too large.'},{status:413});body=JSON.parse(raw)}catch{return Response.json({error:'Invalid session.'},{status:400})}
  const previous=readLiveToken(body?.token)
  const page=livePage(body?.path,checkoutOrigin(request))
  const optedOut=request.headers.get('dnt')==='1' || request.headers.get('sec-gpc')==='1'
  const db=serviceClient()
  if(body?.ended===true || !page || optedOut){
    if(previous){const {error}=await db.from('live_site_sessions').delete().eq('visitor_id',previous.id);if(error)return Response.json({error:'Session could not close.'},{status:503})}
    return Response.json({ended:true},{headers:{'Cache-Control':'no-store'}})
  }
  if(!previous && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.instance_id || ''))return Response.json({error:'Invalid session instance.'},{status:400})
  let token;try{token=previous || newLiveToken(body.instance_id)}catch{return Response.json({error:'Not configured.'},{status:503})}
  // Authenticated identity is looked up on the server; browser member IDs are ignored.
  const user=await requireShopUser(request),location=liveLocation(request)
  const device=['mobile','tablet','desktop'].includes(body.device)?body.device:'unknown'
  const {data,error}=await db.rpc('touch_live_site_session',{p_visitor:token.id,p_member:user?.id || null,p_page:page,p_country:location.country,p_region:location.region,p_city:location.city,p_device:device})
  if(error || !data)return Response.json({error:'Live sessions unavailable.'},{status:503})
  return Response.json({token:token.token},{headers:{'Cache-Control':'private, no-store'}})
}
