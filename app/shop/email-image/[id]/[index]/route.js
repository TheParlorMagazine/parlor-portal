import sharp from 'sharp'
import {serviceClient} from '../../../../../lib/apiAuth'
import {SHOP_PRODUCT_ID} from '../../../../../lib/shopProductImages'
import {campaignImageSource} from '../../../../../lib/campaignProductImages'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const LIMIT=8*1024*1024
const fail=(status=404)=>new Response('Email product image unavailable.',{status,headers:{'Cache-Control':'no-store'}})
export async function GET(_request,{params}){
 const {id,index}=await params
 if(!SHOP_PRODUCT_ID.test(id)||!/^\d{1,3}$/.test(index))return fail()
 try{
  const {data,error}=await serviceClient().from('shop_products').select('id,images').eq('id',id).eq('active',true).eq('public_listing',true).maybeSingle()
  if(error)return fail(503)
  if(!data||!Array.isArray(data.images))return fail()
  const source=campaignImageSource(data.images[Number(index)],process.env.NEXT_PUBLIC_SUPABASE_URL)
  if(!source)return fail()
  const response=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(10000)})
  if(!response.ok||!/^image\/(?:png|jpeg|webp|avif|gif)(?:;|$)/i.test(response.headers.get('content-type')||'')||!response.body)return fail(503)
  if(Number(response.headers.get('content-length'))>LIMIT){await response.body.cancel();return fail(503)}
  const reader=response.body.getReader(),chunks=[];let bytes=0
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>LIMIT){await reader.cancel();return fail(503)}chunks.push(Buffer.from(value))}
  const image=await sharp(Buffer.concat(chunks),{limitInputPixels:40000000}).rotate().resize({width:1200,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toBuffer()
  return new Response(image,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=3600, s-maxage=86400','X-Content-Type-Options':'nosniff'}})
 }catch{return fail(503)}
}
