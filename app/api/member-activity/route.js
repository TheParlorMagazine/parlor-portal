import { serviceClient } from '../../../lib/apiAuth'
import { requireShopUser } from '../../../lib/shopAuth'
import { activityPath,activityTarget } from '../../../lib/memberActivity'
import { checkoutOrigin } from '../../../lib/checkoutOrigin'
export async function POST(request) {
  if(request.headers.get('dnt')==='1' || request.headers.get('sec-gpc')==='1')return Response.json({recorded:false})
  const user=await requireShopUser(request)
  if(!user)return Response.json({error:'Sign in required.'},{status:401})
  let body;try{const raw=await request.text();if(raw.length>8192)return Response.json({error:'Event too large.'},{status:413});body=JSON.parse(raw)}catch{return Response.json({error:'Invalid event.'},{status:400})}
  const origin=checkoutOrigin(request),path=activityPath(body?.path,origin),type=body?.type
  const target=type==='click'?activityTarget(body?.target,origin):null
  if(typeof body?.path!=='string' || body.path.length>2000 || (typeof body.target==='string' && body.target.length>2000) || !path || !['page_view','click'].includes(type) || (type==='click' && !target) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body?.event_id || ''))return Response.json({error:'Invalid event.'},{status:400})
  const {data,error}=await serviceClient().rpc('record_subscriber_site_event',{p_member:user.id,p_event:body.event_id,p_type:type,p_path:path,p_target:target})
  if(error)return Response.json({error:'Activity unavailable.'},{status:503})
  return Response.json({recorded:data===true},{headers:{'Cache-Control':'private, no-store'}})
}

// Standalone HTML can check cookie auth without exposing a member identity.
export async function GET(request) {
  const user=await requireShopUser(request)
  return Response.json({authenticated:!!user},{headers:{'Cache-Control':'private, no-store'}})
}
