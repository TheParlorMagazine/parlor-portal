import { timingSafeEqual } from 'node:crypto'
import { serviceClient } from '../../../../lib/apiAuth'
export async function POST(request){
  const secret=process.env.ACTIVITY_RETENTION_SECRET || process.env.INVENTORY_RECONCILE_SECRET || process.env.CRON_SECRET
  if(!secret)return Response.json({error:'Not configured.'},{status:503})
  const received=request.headers.get('authorization') || '',expected='Bearer '+secret
  if(Buffer.byteLength(received)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return Response.json({error:'Unauthorized.'},{status:401})
  const {error}=await serviceClient().rpc('prune_subscriber_activity')
  if(error)return Response.json({error:'Cleanup failed.'},{status:503})
  const {error:liveError}=await serviceClient().rpc('prune_live_site_sessions')
  return Response.json(liveError?{error:'Cleanup failed.'}:{ok:true},{status:liveError?503:200,headers:{'Cache-Control':'no-store'}})
}
