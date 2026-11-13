import { requireUser,serviceClient,memberOf } from '../../../../../lib/apiAuth'
import { paidPlanDefinitions,paidPlanKey,paidMembershipStatus,planSubscriberRows } from '../../../../../lib/paidPlanHistory'
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
async function handle(request,write){
 const user=await requireUser(request);if(!user)return reply({error:'Sign in required.'},401)
 const db=serviceClient(),staff=await memberOf(db,user.id)
 if(!['admin','finance_admin'].includes(staff.role))return reply({error:'Admin or finance access required.'},403)
 let body;try{body=write?await request.json():{key:new URL(request.url).searchParams.get('key')}}catch{return reply({error:'Invalid request.'},400)}
 if(!paidPlanDefinitions[body?.key])return reply({error:'Choose a supported plan.'},400)
 if(write){
  if(body.confirm!==true||!/^[0-9a-f-]{36}$/i.test(body.memberId||''))return reply({error:'Confirm the former subscriber first.'},400)
  const {data:member,error}=await db.from('members').select('*').eq('id',body.memberId).maybeSingle()
  if(error)return reply({error:'Subscriber could not be checked.'},503)
  if(!member||paidPlanKey(member.plan)||paidMembershipStatus(member)!=='churned'||member.stripe_subscription_id)return reply({error:'Only an ended membership with no current paid plan can be assigned a missing historical plan.'},409)
  const {error:saveError}=await db.from('member_paid_plan_history').upsert({member_id:member.id,plan_key:body.key,ended_at:new Date().toISOString(),source:'admin_correction'},{onConflict:'member_id,plan_key',ignoreDuplicates:true})
  if(saveError)return reply({error:'The historical membership could not be saved. Apply the paid-plan history migration first.'},503)
  return reply({recorded:true})
 }
 const [current,history,unassigned]=await Promise.all([
  db.from('members').select('*').in('plan',paidPlanDefinitions[body.key]).order('joined_at',{ascending:false}),
  db.from('member_paid_plan_history').select('member_id,ended_at,members(*)').eq('plan_key',body.key),
  db.from('members').select('*').is('plan',null).in('subscription_status',['churned','cancelled','canceled','expired'])
 ])
 if(current.error||history.error||unassigned.error)return reply({error:'Paid-plan history could not be loaded. Apply the paid-plan history migration before using these totals.'},503)
 const known=new Set((history.data||[]).map(h=>h.member_id))
 return reply({members:planSubscriberRows(body.key,current.data||[],history.data||[]),unassigned:(unassigned.data||[]).filter(m=>!known.has(m.id)&&!m.stripe_subscription_id)})
}
export const GET=request=>handle(request,false)
export const POST=request=>handle(request,true)
