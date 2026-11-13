import { serviceClient } from '../../../../lib/apiAuth'
import { DEFAULT_SHOP_POPUP,SHOP_POPUP_PLACEMENT } from '../../../../lib/shopPopup'
export const dynamic='force-dynamic'
export async function GET(){
 const {data,error}=await serviceClient().from('announcements').select('*').eq('placement',SHOP_POPUP_PLACEMENT).order('sort',{ascending:true}).order('created_at',{ascending:false}).limit(1)
 if(error)return Response.json({error:'Shop popup could not be loaded.'},{status:503,headers:{'Cache-Control':'no-store'}})
 // Query inactive rows too: a saved off switch must never fall back to on.
 return Response.json({announcement:data?.[0]||DEFAULT_SHOP_POPUP},{headers:{'Cache-Control':'no-store'}})
}
