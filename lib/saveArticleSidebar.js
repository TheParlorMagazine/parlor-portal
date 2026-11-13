import { SIDEBAR_PLACEMENT,SIDEBAR_IDS,sidebarConfig,sidebarSlots,validateSidebar,encodeSidebar } from './articleSidebars'
const fields=['kicker','headline','message','cta_label','cta_href','type','active','sort','starts_at','ends_at','image_url','placement']
const pick=row=>Object.fromEntries(fields.filter(key=>key in row).map(key=>[key,row[key]]))
export async function saveArticleSidebar(db,body){
 const result=await db.from('announcements').select('*').eq('placement',SIDEBAR_PLACEMENT).order('sort',{ascending:true}).order('created_at',{ascending:false})
 if(result.error)return{error:'Article sidebars could not be loaded.',status:503}
 const rows=result.data||[],source=rows.find(row=>row.id===body.id),virtualSource=sidebarSlots(rows).find(row=>row.id===body.id)
 if(body.id&&!source&&!virtualSource)return{error:'Sidebar not found. Reload Announcements.',status:404}
 const patch={...pick(source||virtualSource||{}),...pick(body),placement:SIDEBAR_PLACEMENT}
 if(!('headline'in body)&&!patch.headline)patch.headline=source?.kicker||source?.message||'Article announcement'
 if(!('image_url'in body))patch.image_url=encodeSidebar(sidebarConfig(source||virtualSource))
 let config;try{config=validateSidebar(patch)}catch(error){return{error:error.message,status:400}}
 if(config.format==='store'&&patch.active!==false&&config.product_source!=='bones_default'){
  const catalogue=await db.from('shop_products').select('id').eq('active',true).in('id',config.product_ids)
  if(catalogue.error)return{error:'Store items could not be checked.',status:503}
  if(config.product_ids.some(id=>!catalogue.data?.some(product=>product.id===id)))return{error:'Some selected store items are unavailable. Reload the item picker and choose active items.',status:400}
 }
 const targetId=SIDEBAR_IDS[config.side],target=sidebarSlots(rows).find(row=>sidebarConfig(row).side===config.side)
 const ownSlot=body.id===target?.id||body.id===targetId
 if(target?.active&&!ownSlot&&body.replace_existing!==true)return{error:`The ${config.side} side already has a sidebar. Confirm replacing it or choose the other side.`,status:409}
 const updates=new Map()
 if(source||virtualSource){
  const old=source||virtualSource,oldSide=sidebarConfig(old).side
  if(oldSide!==config.side){
   updates.set(SIDEBAR_IDS[oldSide],{...pick(old),id:SIDEBAR_IDS[oldSide],active:false})
   if(source&&source.id!==SIDEBAR_IDS[oldSide])updates.set(source.id,{...pick(source),id:source.id,active:false})
  }else if(source&&source.id!==targetId)updates.set(source.id,{...pick(source),id:source.id,active:false})
 }
 updates.set(targetId,{...patch,id:targetId})
 // Existing announcements.id is the unique slot key. One bulk upsert makes
 // side moves atomic, and concurrent saves cannot create a second slot row.
 const saved=await db.from('announcements').upsert([...updates.values()],{onConflict:'id'}).select('*')
 if(saved.error)return{error:'The article sidebar could not be saved. No success was confirmed.',status:503}
 return{announcement:saved.data?.find(row=>row.id===targetId)||{...patch,id:targetId},status:200}
}
