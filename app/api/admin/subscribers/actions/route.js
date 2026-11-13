import Stripe from 'stripe'
import { requireUser,serviceClient,memberOf } from '../../../../../lib/apiAuth'
import { subscriberActionContext,applySubscriberAction,SubscriberActionError } from '../../../../../lib/subscriberActions'
export const dynamic='force-dynamic'
export const maxDuration=60
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
const valid=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')
async function handle(request,write){
 const user=await requireUser(request);if(!user)return reply({error:'Sign in required.'},401)
 const db=serviceClient(),staff=await memberOf(db,user.id)
 if(!['admin','finance_admin'].includes(staff.role))return reply({error:'Admin or finance access required.'},403)
 let body
 try{body=write?await request.json():{memberId:new URL(request.url).searchParams.get('memberId'),action:new URL(request.url).searchParams.get('action')}}catch{return reply({error:'Invalid subscriber action.'},400)}
 if(!valid(body?.memberId))return reply({error:'Choose a valid subscriber.'},400)
 try{
  // Construct lazily: local access and consent actions do not need a Stripe key.
  let client
  const stripe=new Proxy({}, {get(_target,key){if(!process.env.STRIPE_SECRET_KEY)throw new SubscriberActionError('Stripe billing is not configured.',503);client||=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:12000,maxNetworkRetries:0});return client[key]}})
  return reply(write?await applySubscriberAction(db,stripe,user,body):await subscriberActionContext(db,stripe,body.memberId,body.action))
 }catch(error){return reply({error:error instanceof SubscriberActionError?error.message:'The action could not be confirmed. Refresh the profile and check billing before retrying.',requiresReview:error instanceof SubscriberActionError?error.requiresReview:write},error instanceof SubscriberActionError?error.status:502)}
}
export const GET=request=>handle(request,false)
export const POST=request=>handle(request,true)
