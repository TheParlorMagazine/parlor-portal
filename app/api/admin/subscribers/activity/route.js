import { requireUser,serviceClient,memberOf } from '../../../../../lib/apiAuth'
export async function GET(request){
  const user=await requireUser(request)
  if(!user)return Response.json({error:'Sign in required.'},{status:401})
  const db=serviceClient(),staff=await memberOf(db,user.id)
  if(!['admin','editor','finance_admin','social_admin'].includes(staff.role))return Response.json({error:'Forbidden.'},{status:403})
  const params=new URL(request.url).searchParams,id=params.get('member_id'),offset=Number(params.get('offset') || 0)
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '') || !Number.isSafeInteger(offset) || offset<0 || offset>100000)return Response.json({error:'Invalid subscriber or page.'},{status:400})
  const {data:member,error:lookup}=await db.from('members').select('id').eq('id',id).maybeSingle()
  if(lookup)return Response.json({error:'Subscriber could not be checked.'},{status:503})
  if(!member)return Response.json({error:'Subscriber not found.'},{status:404})
  const {data,error}=await db.rpc('subscriber_activity_30_days',{p_member:id,p_offset:offset})
  if(error || !data)return Response.json({error:'Activity is unavailable. Check the subscriber activity migration.'},{status:503})
  return Response.json({...data,events:(data.events || []).slice(0,50),hasMore:(data.events || []).length>50},{headers:{'Cache-Control':'private, no-store'}})
}
