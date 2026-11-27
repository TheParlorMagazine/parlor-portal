const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function campaignProductImageUrl(product){
 if(!ID.test(product?.id)||!product?.image)return product?.image||''
 let hash=2166136261
 for(const char of product.image)hash=Math.imul(hash^char.charCodeAt(0),16777619)
 return `https://theparlormagazine.com/shop/email-image/${product.id}/0?v=${(hash>>>0).toString(16)}`
}
// Only fetch images from the catalogue's known public storage providers.
// Never accept a caller-supplied proxy URL or follow redirects.
export function campaignImageSource(value,supabaseUrl){
 try{
  const url=new URL(value)
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null
  if(url.hostname==='res.cloudinary.com'&&url.pathname.includes('/image/upload/')){
   if(url.pathname.includes('/s--'))return null
   // Request alpha-preserving output before our server performs compositing.
   url.pathname=url.pathname.replace(/\/image\/upload\/(.*)/,(_,rest)=>'/image/upload/'+rest.split('/').map(part=>part.split(',').filter(option=>!/^f_(?:auto|jpg|jpeg|webp|avif|png|gif)$/.test(option)).join(',')).filter(Boolean).join('/')).replace(/\.(?:webp|jpe?g|avif)$/i,'.png')
   return url.href
  }
  if(url.hostname==='static.wixstatic.com'&&url.pathname.startsWith('/media/')){
   url.pathname=url.pathname.split('/v1/')[0];url.search='';return url.href
  }
  if(['images.printify.com','images-api.printify.com'].includes(url.hostname))return url.href
  const storage=new URL(supabaseUrl)
  return url.hostname===storage.hostname&&url.pathname.startsWith('/storage/v1/object/public/')?url.href:null
 }catch{return null}
}
