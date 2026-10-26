import Stripe from 'stripe'
import { reconcileCheckoutRows } from '../../../../lib/reconcileCheckouts'
export async function POST(request) {
 const secret=process.env.INVENTORY_RECONCILE_SECRET
 if(!secret)return Response.json({error:'Reconciliation is not configured'},{status:503})
 if(request.headers.get('authorization')!=='Bearer '+secret)return Response.json({error:'Unauthorized'},{status:401})
 try {
  const results=await reconcileCheckoutRows(new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:2500,maxNetworkRetries:0}))
  return Response.json({checked:results.length,failed:results.filter(r=>!r.ok).length},{headers:{'Cache-Control':'no-store'}})
 }catch(error){console.error('Checkout reconciliation failed:',error.message);return Response.json({error:'Reconciliation failed'},{status:503})}
}
