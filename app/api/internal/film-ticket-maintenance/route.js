import Stripe from 'stripe'
import { maintainFilmTickets } from '../../../../lib/filmTicketMaintenance'
export async function POST(request) {
 const secret=process.env.INVENTORY_RECONCILE_SECRET
 if(!secret)return Response.json({error:'Maintenance is not configured'},{status:503})
 if(request.headers.get('authorization')!=='Bearer '+secret)return Response.json({error:'Unauthorized'},{status:401})
 try{
  const result=await maintainFilmTickets(new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:2000,maxNetworkRetries:0}))
  return Response.json(result,{headers:{'Cache-Control':'no-store'}})
 }catch{return Response.json({error:'Film ticket maintenance unavailable'},{status:503})}
}
