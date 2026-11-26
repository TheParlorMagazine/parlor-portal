import { parseDocument } from 'htmlparser2'
// Only structured public film metadata is imported. No scripts are executed.
export function parseFilmMetadata(html) {
 const doc=parseDocument(html),result={}
 const text=v=>typeof v==='string'?v.trim().slice(0,5000):''
 const person=v=>Array.isArray(v)?v.map(person).filter(Boolean).join(', '):text(typeof v==='object'?v?.name:v)
 function structured(v){
  if(!v||typeof v!=='object')return
  if(Array.isArray(v)){v.forEach(structured);return}
  const types=[v['@type']].flat()
  if(types.includes('Movie')){
   Object.assign(result,Object.fromEntries(Object.entries({title:text(v.name),synopsis:text(v.description),filmmaker:person(v.director),language:person(v.inLanguage),subtitles:person(v.subtitleLanguage)}).filter(([,value])=>value)))
   const duration=/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(v.duration || '')
   if(duration)result.runtime_minutes=Number(duration[1]||0)*60+Number(duration[2]||0)+Math.ceil(Number(duration[3]||0)/60)
  }
  if(v['@graph'])structured(v['@graph'])
  if(v.workPresented)structured(v.workPresented)
 }
 function visit(node){
  if(node.name==='script'&&node.attribs?.type==='application/ld+json'){
   try{structured(JSON.parse((node.children||[]).map(c=>c.data||'').join('')))}catch{}
  }
  if(node.name==='meta'){
   const key=node.attribs?.property||node.attribs?.name,value=text(node.attribs?.content)
   if(key==='og:title'&&!result.title)result.title=value
   if((key==='og:description'||key==='description')&&!result.synopsis)result.synopsis=value
  }
  ;(node.children||[]).forEach(visit)
 }
 visit(doc)
 return Object.fromEntries(Object.entries(result).filter(([,v])=>v!==''&&v!=null))
}
export function publicFilmUrl(value){
 const url=new URL(value)
 if(url.protocol!=='https:'||!['kinema.com','www.kinema.com'].includes(url.hostname)||url.port||url.username||url.password||url.search||!/^\/(events|films|movies)\/[\w-]+\/?$/.test(url.pathname))throw new Error('Use a public Kinema film or event URL without private access parameters.')
 return url
}
