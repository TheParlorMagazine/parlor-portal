import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
export async function GET(request) {
  const user=await requireUser(request)
  if(!user)return Response.json({error:'Sign in required.'},{status:401})
  const db=serviceClient(),member=await memberOf(db,user.id)
  if(!['admin','editor','social_admin'].includes(member.role))return Response.json({error:'Forbidden.'},{status:403})
  const q=new URL(request.url).searchParams,id=q.get('campaign_id'),offset=Number(q.get('offset') || 0),filter=q.get('filter') || 'all'
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '') || !Number.isSafeInteger(offset) || offset<0 || offset>100000 || !['all','clicked','opened','unsubscribed'].includes(filter))return Response.json({error:'Invalid activity filter.'},{status:400})
  const {data,error}=await db.rpc('campaign_subscriber_activity',{p_campaign:id,p_offset:offset,p_filter:filter})
  if(error)return Response.json({error:'Subscriber activity is unavailable. Check the tracking migration.'},{status:503})
  return Response.json({subscribers:(data || []).slice(0,50),hasMore:(data || []).length>50},{headers:{'Cache-Control':'private, no-store'}})
}
