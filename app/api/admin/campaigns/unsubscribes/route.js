import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
export async function GET(request) {
  const user=await requireUser(request)
  if(!user)return Response.json({error:'Sign in required.'},{status:401})
  const db=serviceClient(),member=await memberOf(db,user.id)
  if(!['admin','editor','social_admin'].includes(member.role))return Response.json({error:'Forbidden.'},{status:403})
  const offset=Number(new URL(request.url).searchParams.get('offset') || 0)
  if(!Number.isSafeInteger(offset) || offset<0 || offset>100000)return Response.json({error:'Invalid page.'},{status:400})
  const {data,error}=await db.from('email_subscription_events').select('id,event_type,source,occurred_at,campaign_id,members(full_name,email),email_campaigns(name,subject)').eq('event_type','unsubscribed').order('occurred_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+50)
  if(error)return Response.json({error:'Unsubscribe history is unavailable. Check the tracking migration.'},{status:503})
  return Response.json({events:(data || []).slice(0,50),hasMore:(data || []).length>50},{headers:{'Cache-Control':'private, no-store'}})
}
