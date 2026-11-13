// The shop popup uses the existing announcements text/image columns. A small
// media manifest in image_url supports mixed assets without a schema change.
export const SHOP_POPUP_PLACEMENT='shop_popup'
export const DEFAULT_SHOP_POPUP={placement:SHOP_POPUP_PLACEMENT,type:'campaign',active:true,sort:0,headline:'Trick or Treat at The Parlor',kicker:'',message:'',cta_label:'Join the fun →',cta_href:'/trick-or-treat',image_url:null,starts_at:null,ends_at:null}
export function safePopupUrl(value,{link=false}={}){
 if(typeof value!=='string'||!value.trim())return ''
 const url=value.trim()
 if(url.startsWith('/')&&!url.startsWith('//')&&!/[\\\s]/.test(url))return url
 try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?url:''}catch{return ''}
}
export function popupMedia(value){
 if(!value)return []
 let items
 try{const data=JSON.parse(value);items=data?.version===1&&Array.isArray(data.items)?data.items:[]}catch{items=[{url:value,kind:/\.(mp4|webm|mov)(?:[?#]|$)/i.test(value)?'video':'image',alt:''}]}
 return items.slice(0,6).map(item=>({url:safePopupUrl(item.url),kind:item.kind==='video'?'video':'image',alt:typeof item.alt==='string'?item.alt.slice(0,300):''})).filter(item=>item.url)
}
export function encodePopupMedia(items){return items.length?JSON.stringify({version:1,items}):null}
export function popupIsLive(item,now=Date.now()){
 return !!item?.active&&(!item.starts_at||Date.parse(item.starts_at)<=now)&&(!item.ends_at||Date.parse(item.ends_at)>=now)
}
export function popupDismissKey(item){
 const base='parlor:shop-trick-or-treat:dismissed'
 if(!item.id)return base
 const value=JSON.stringify([item.headline,item.message,item.kicker,item.image_url,item.cta_label,item.cta_href]);let hash=0
 for(let i=0;i<value.length;i++)hash=(Math.imul(hash,31)+value.charCodeAt(i))|0
 return base+':'+item.id+':'+(hash>>>0).toString(36)
}
export function validateShopPopup(patch){
 if(patch.placement!==SHOP_POPUP_PLACEMENT)return
 for(const key of ['headline','message','kicker','cta_label'])if(patch[key]!=null&&(typeof patch[key]!=='string'||patch[key].length>2000))throw Error('Popup text must be no more than 2,000 characters.')
 if(patch.cta_href&&!safePopupUrl(patch.cta_href,{link:true}))throw Error('Use a site path or secure HTTPS button link.')
 if(patch.image_url){
  if(typeof patch.image_url!=='string'||patch.image_url.length>24000)throw Error('Choose up to six media items.')
  let data;try{data=JSON.parse(patch.image_url)}catch{}
  if(data){if(data.version!==1||!Array.isArray(data.items)||data.items.length>6||data.items.some(i=>!i||!['video','image'].includes(i.kind)||!safePopupUrl(i.url)))throw Error('Choose up to six valid image, GIF or video URLs.')}
  else if(!safePopupUrl(patch.image_url))throw Error('Use a site path or secure HTTPS media URL.')
 }
}
