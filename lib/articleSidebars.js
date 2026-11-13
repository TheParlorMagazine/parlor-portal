import { safePopupUrl,popupMedia,popupIsLive } from './shopPopup'
export const SIDEBAR_PLACEMENT='article_sidebar'
export const SIDEBAR_IDS={left:'11cb1000-0000-4000-8000-000000000001',right:'11cb1000-0000-4000-8000-000000000002'}
const base={placement:SIDEBAR_PLACEMENT,type:'campaign',active:true,sort:0,kicker:'',message:'',starts_at:null,ends_at:null}
export function encodeSidebar(config){return JSON.stringify({version:1,kind:'article_sidebar',...config})}
export function sidebarConfig(row){
 let value;try{value=JSON.parse(row?.image_url||'null')}catch{}
 if(value?.kind==='article_sidebar'&&value.version===1)return{side:value.side==='right'?'right':'left',format:value.format==='store'?'store':'announcement',media:Array.isArray(value.media)?value.media:[],product_ids:Array.isArray(value.product_ids)?value.product_ids:[],legacy_animation:!!value.legacy_animation,product_source:value.product_source==='bones_default'?'bones_default':'selected'}
 return{side:row?.id===SIDEBAR_IDS.right?'right':'left',format:'announcement',media:popupMedia(row?.image_url),product_ids:[],legacy_animation:false,product_source:'selected'}
}
export const DEFAULT_SIDEBARS=[
 {...base,id:SIDEBAR_IDS.left,_virtual:true,headline:'Trick or Treat at The Parlor',cta_label:'Join the fun →',cta_href:'/trick-or-treat',image_url:encodeSidebar({side:'left',format:'announcement',media:[],product_ids:[],legacy_animation:true})},
 {...base,id:SIDEBAR_IDS.right,_virtual:true,headline:'Bones Coffee Favorites',cta_label:'From the Parlor Shop',cta_href:'/shop',image_url:encodeSidebar({side:'right',format:'store',media:[],product_ids:[],product_source:'bones_default'})},
]
// A canonical primary-key row claims its side even while hidden or out of
// schedule. Legacy records cannot fall through and reactivate a hidden slot.
export function sidebarSlots(rows){return ['left','right'].map(side=>rows.find(row=>row.id===SIDEBAR_IDS[side])||rows.find(row=>row.placement===SIDEBAR_PLACEMENT&&sidebarConfig(row).side===side)||DEFAULT_SIDEBARS.find(row=>sidebarConfig(row).side===side))}
export function liveSidebars(rows,now=Date.now()){return sidebarSlots(rows).filter(row=>popupIsLive(row,now))}
export function validateSidebar(row){
 if(row.active!=null&&typeof row.active!=='boolean')throw Error('Choose a valid active setting.')
 if(row.placement!==SIDEBAR_PLACEMENT)throw Error('Choose an article sidebar.')
 let data;try{data=JSON.parse(row.image_url)}catch{throw Error('Choose a sidebar format and side.')}
 if(data?.kind!=='article_sidebar'||data.version!==1||!['left','right'].includes(data.side)||!['announcement','store'].includes(data.format))throw Error('Choose a sidebar format and side.')
 for(const key of ['headline','kicker','message','cta_label'])if(row[key]!=null&&(typeof row[key]!=='string'||row[key].length>2000))throw Error('Sidebar text must be no more than 2,000 characters.')
 if(!row.headline?.trim())throw Error('Add a headline.')
 if(row.cta_href&&!safePopupUrl(row.cta_href))throw Error('Use a site path or secure HTTPS button link.')
 if(!Array.isArray(data.media)||data.media.length>6||data.media.some(item=>!item||!['image','video'].includes(item.kind)||!safePopupUrl(item.url)))throw Error('Choose up to six valid images, GIFs or videos.')
 if(!Array.isArray(data.product_ids)||data.product_ids.length>6||data.product_ids.some(id=>typeof id!=='string'||!id||id.length>100)||new Set(data.product_ids).size!==data.product_ids.length)throw Error('Choose up to six different store items.')
 if(data.format==='store'&&row.active!==false&&data.product_source!=='bones_default'&&!data.product_ids.length)throw Error('Choose at least one store item.')
 if(row.starts_at&&row.ends_at&&Date.parse(row.starts_at)>=Date.parse(row.ends_at))throw Error('Show until must be after Show from.')
 if(row.image_url.length>24000)throw Error('The sidebar media configuration is too large.')
 return sidebarConfig(row)
}
