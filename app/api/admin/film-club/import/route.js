import https from 'node:https'
import { lookup } from 'node:dns/promises'
import { requireUser, memberOf, serviceClient } from '../../../../../lib/apiAuth'
import { parseFilmMetadata, publicFilmUrl } from '../../../../../lib/filmMetadata'
function publicAddress(address){
 // Reject private/reserved IPv4 and all IPv6; request a public IPv4 explicitly.
 const octets=address.split('.').map(Number)
 return octets.length===4&&octets.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&![0,10,127].includes(octets[0])&&!(octets[0]===169&&octets[1]===254)&&!(octets[0]===172&&octets[1]>=16&&octets[1]<=31)&&!(octets[0]===192&&[0,168].includes(octets[1]))&&!(octets[0]===198&&[18,19,51].includes(octets[1]))&&!(octets[0]===203&&octets[1]===0)&&octets[0]<224&&!(octets[0]===100&&octets[1]>=64&&octets[1]<=127)
}
async function readPage(value,redirects=0){
 const url=publicFilmUrl(value),{address}=await lookup(url.hostname,{family:4})
 if(!publicAddress(address))throw Error('Provider address unavailable.')
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{family:4,lookup:(_host,_opts,cb)=>cb(null,address,4),headers:{Accept:'text/html','User-Agent':'TheParlor Film metadata preview'}},res=>{
   if([301,302,303,307,308].includes(res.statusCode)){
    res.resume();if(redirects>=3)return reject(Error('Too many provider redirects.'))
    return readPage(new URL(res.headers.location,url).href,redirects+1).then(resolve,reject)
   }
   if(res.statusCode!==200||!res.headers['content-type']?.includes('text/html')){res.resume();return reject(Error('Public film details unavailable.'))}
   let size=0,parts=[]
   res.on('data',chunk=>{size+=chunk.length;if(size>1024*1024){req.destroy(Error('Provider page too large.'));return}parts.push(chunk)})
   res.on('end',()=>resolve(Buffer.concat(parts).toString('utf8')));res.on('error',reject)
  })
  req.setTimeout(8000,()=>req.destroy(Error('Provider request timed out.')));req.on('error',reject)
 })
}
export async function POST(request){
 const user=await requireUser(request);if(!user)return Response.json({error:'Sign in'},{status:401})
 const member=await memberOf(serviceClient(),user.id);if(!['admin','editor'].includes(member.role))return Response.json({error:'Forbidden'},{status:403})
 try{const body=await request.json();return Response.json({details:parseFilmMetadata(await readPage(body.url))})}
 catch{return Response.json({error:'Could not import public film details. You can enter them manually.'},{status:422})}
}
