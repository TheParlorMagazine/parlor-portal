import { serviceClient } from '../../../../lib/apiAuth'
import { SIDEBAR_PLACEMENT,liveSidebars,sidebarConfig } from '../../../../lib/articleSidebars'
import { selectBonesProducts } from '../../../../lib/bonesProducts'
import { publicShopProduct } from '../../../../lib/shopProductImages'
export const dynamic='force-dynamic'
export async function GET(){
 const db=serviceClient(),rows=await db.from('announcements').select('*').eq('placement',SIDEBAR_PLACEMENT).order('sort',{ascending:true}).order('created_at',{ascending:false})
 if(rows.error)return Response.json({error:'Article sidebars unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})
 const live=liveSidebars(rows.data||[])
 let products=[]
 if(live.some(row=>sidebarConfig(row).format==='store')){
  let query=db.from('shop_products').select('id,name,images,variant,description,external_url').eq('active',true)
  if(!live.some(row=>sidebarConfig(row).product_source==='bones_default'))query=query.in('id',[...new Set(live.flatMap(row=>sidebarConfig(row).product_ids))])
  const catalogue=await query.order('sort',{ascending:true}).order('created_at',{ascending:false})
  if(catalogue.error)return Response.json({error:'Sidebar items unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})
  products=(catalogue.data||[]).map(publicShopProduct)
 }
 const sidebars=live.map(row=>{
  const config=sidebarConfig(row),selected=config.product_source==='bones_default'?selectBonesProducts(products):config.product_ids.map(id=>products.find(p=>p.id===id)).filter(Boolean)
  return{...row,config,products:config.format==='store'?selected:[]}
 })
 return Response.json({sidebars},{headers:{'Cache-Control':'no-store'}})
}
