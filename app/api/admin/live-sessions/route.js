import { requireUser,serviceClient,memberOf } from '../../../../lib/apiAuth'
export async function GET(request){
  const user=await requireUser(request)
  if(!user)return Response.json({error:'Sign in required.'},{status:401})
  const db=serviceClient(),me=await memberOf(db,user.id)
  if(!['admin','editor','finance_admin','social_admin'].includes(me.role))return Response.json({error:'Forbidden.'},{status:403})
  const cutoff=new Date(Date.now()-90000).toISOString(),rows=[]
  // The insert RPC caps live sessions at 5,000. Read every page, not just the
  // PostgREST default first 1,000, and sort on a stable key while collecting.
  for(let offset=0;offset<5000;offset+=1000){
    const {data,error}=await db.from('live_site_sessions').select('visitor_id,member_id,current_page,country,region,city,device_type,first_seen,last_seen,recent_pages,members(full_name,email)').gte('last_seen',cutoff).order('visitor_id',{ascending:true}).range(offset,offset+999)
    if(error)return Response.json({error:'Live sessions could not be loaded. Check the live-session migration.'},{status:503})
    rows.push(...(data || []));if((data || []).length<1000)break
  }
  const sessions=[...new Map(rows.map(row=>[row.visitor_id,row])).values()].map(({members,...row})=>({...row,full_name:row.member_id?members?.full_name || null:null,email:row.member_id?members?.email || null:null,is_member:!!row.member_id})).sort((a,b)=>Date.parse(b.last_seen)-Date.parse(a.last_seen))
  return Response.json({sessions,count:sessions.length,asOf:new Date().toISOString(),activeWindowSeconds:90},{headers:{'Cache-Control':'private, no-store'}})
}
