import { requireUser,serviceClient,memberOf } from '../../../../../lib/apiAuth'
import { addScreeningSubscriber } from '../../../../../lib/filmScreeningSubscribers'
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
async function gate(request,eventId){
 const user=await requireUser(request);if(!user)return{error:Response.json({error:'Sign in'},{status:401})}
 const db=serviceClient(),member=await memberOf(db,user.id);if(!['admin','editor'].includes(member.role))return{error:Response.json({error:'Forbidden'},{status:403})}
 if(!uuid.test(eventId))return{error:Response.json({error:'Select a screening.'},{status:400})}
 const {data,error}=await db.from('film_club_screenings').select('event_id').eq('event_id',eventId).maybeSingle()
 if(error)return{error:Response.json({error:'Could not load screening.'},{status:503})}
 return data?{db}:{error:Response.json({error:'Screening not found.'},{status:404})}
}
export async function GET(request){
 const url=new URL(request.url),eventId=url.searchParams.get('eventId'),{db,error}=await gate(request,eventId);if(error)return error
 try{
  if(url.searchParams.has('q')){
   const q=(url.searchParams.get('q') || '').replace(/[,()%_\\]/g,' ').trim().slice(0,100)
   if(q.length<2)return Response.json({members:[]})
   const {data,error}=await db.from('members').select('id,full_name,email,plan').eq('deactivated',false).or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).order('full_name').limit(15)
   if(error)throw Error('Could not search subscribers.');return Response.json({members:(data || []).filter(member=>typeof member.email==='string'&&member.email)},{headers:{'Cache-Control':'private, no-store'}})
  }
  async function pages(table,columns,order){
   const rows=[]
   for(let offset=0;offset<5000;offset+=500){let q=db.from(table).select(columns).eq('event_id',eventId).order(order);if(table==='film_club_tickets')q=q.in('payment_status',['paid','partially_refunded']);const {data,error}=await q.range(offset,offset+499);if(error)throw Error('Could not load screening subscribers.');rows.push(...data);if(data.length<500)break}
   return rows
  }
  const [buyerRows,ticketRows]=await Promise.all([
   pages('film_club_ticket_buyers','email','email'),
   pages('film_club_tickets','member:members(id,full_name,email,plan,newsletter_subscribed,unsubscribed_at)','id')
  ])
  const contacts=new Map(buyerRows.map(b=>[b.email,{email:b.email,source:'External ticket'}]))
  const emails=[...contacts.keys()]
  for(let i=0;i<emails.length;i+=200){const {data,error}=await db.from('members').select('id,full_name,email,plan,newsletter_subscribed,unsubscribed_at').in('email',emails.slice(i,i+200));if(error)throw Error('Could not load subscriber details.');for(const member of data || [])contacts.set(member.email.toLowerCase(),{...member,source:'External ticket'})}
  for(const ticket of ticketRows)if(ticket.member?.email)contacts.set(ticket.member.email.toLowerCase(),{...ticket.member,source:'Parlor ticket'})
  return Response.json({subscribers:[...contacts.values()].sort((a,b)=>(a.full_name||a.email).localeCompare(b.full_name||b.email)),truncated:buyerRows.length===5000||ticketRows.length===5000},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return Response.json({error:e.message},{status:503})}
}
export async function POST(request){
 const body=await request.json().catch(()=>null),{db,error}=await gate(request,body?.eventId);if(error)return error
 try{const member=await addScreeningSubscriber(db,body.eventId,{email:body.email,full_name:body.full_name});return Response.json({ok:true,member},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return Response.json({error:e.message},{status:409})}
}
