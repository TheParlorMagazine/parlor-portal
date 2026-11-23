const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),fs=require('node:fs')
const {build}=require('/tmp/parlor-tour-validation/node_modules/esbuild')
const {renderToStaticMarkup}=require('react-dom/server')
const id='11111111-1111-4111-8111-111111111111'
let compiled
async function modules(){return compiled ||= (async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'film-media-')),result={}
 for(const [key,entry] of Object.entries({helper:'lib/filmClubMedia.js',route:'app/api/admin/film-club/route.js',player:'app/_components/FilmTrailer.js'})){
  const out=path.join(dir,key+'.cjs');await build({entryPoints:[entry],bundle:true,outfile:out,platform:'node',format:'cjs',packages:'external',jsx:'automatic',loader:{'.js':'jsx','.css':'empty'},plugins:[{name:'auth',setup(b){b.onResolve({filter:/lib\/apiAuth$/},()=>({path:'auth',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const requireUser=async()=>global.filmUser;export const memberOf=async()=>({role:global.filmRole});export const serviceClient=()=>global.filmDB;`}))}}]});result[key]=require(out)
 }return result
})()}
function fixture({missing=false,coverFail=false}={}){
 const writes=[],rpcs=[]
 return {writes,rpcs,db:{rpc:async(name,args)=>{rpcs.push({name,args});return {data:id}},from(table){let update=null;const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},update(value){update=value;writes.push({table,value,filters});return q},async maybeSingle(){if(!update)return {data:missing?null:{event_id:id}};return coverFail&&table==='events'?{error:{code:'offline'}}:{data:{id,event_id:id}}}};return q}}}
}
const request=body=>({json:async()=>body})
test('Film Club media permits HTTPS video files and preserves YouTube/Vimeo embeds',async()=>{
 const {helper:h,player}=await modules()
 assert.equal(h.filmTrailerSource('https://youtu.be/abc'),'https://www.youtube.com/embed/abc')
 assert.equal(h.filmTrailerSource('https://vimeo.com/123'),'https://player.vimeo.com/video/123')
 assert.equal(h.filmTrailerSource('https://media.invalid/clip.mp4?v=1'),'https://media.invalid/clip.mp4?v=1')
 for(const url of ['javascript:alert(1)','http://media.invalid/a.mp4','https://media.invalid/file.html','https://user:pass@media.invalid/a.mp4'])assert.equal(h.filmTrailerSource(url),null)
 assert.equal(h.filmUploadError({type:'video/mp4',size:4000},'trailer'),null)
 assert.match(h.filmUploadError({type:'video/mp4',size:5*1024*1024},'trailer'),/4 MB/)
 assert.match(h.filmUploadError({type:'text/html',size:50},'cover'),/Choose/)
 assert.match(renderToStaticMarkup(player.default({src:'https://media.invalid/a.mp4',title:'Film'})),/<video[^>]*controls/)
 assert.match(renderToStaticMarkup(player.default({src:h.filmTrailerSource('https://youtu.be/abc'),title:'Film'})),/<iframe/)
})
test('only Film Club admins/editors may create or update media',async()=>{
 const {route}=await modules();global.filmDB={from(){throw Error('Unexpected query')}}
 global.filmUser=null;assert.equal((await route.POST(request({}))).status,401)
 global.filmUser={id:'creator'};global.filmRole='member';assert.equal((await route.PATCH(request({eventId:id,action:'cover',cover_image_url:''}))).status,403)
})
test('screening creation saves cover on its own draft and does not accept unsafe media',async()=>{
 const {route}=await modules();global.filmUser={id:'creator'};global.filmRole='editor'
 const f=fixture();global.filmDB=f.db
 const body={id,title:'Film',starts_at:'2099-12-12T19:00:00Z',cover_image_url:'https://media.invalid/cover.webp',trailer_url:'https://media.invalid/clip.webm'}
 assert.equal((await route.POST(request({...body,cover_image_url:'javascript:bad'}))).status,400)
 assert.equal((await route.POST(request({...body,trailer_url:'https://media.invalid/page.html'}))).status,400)
 assert.equal(f.rpcs.length,0)
 assert.equal((await route.POST(request(body))).status,201)
 assert.equal(f.rpcs[0].args.p_id,id);assert.equal(f.rpcs[0].args.p_trailer_url,body.trailer_url)
 assert.deepEqual(f.writes[0],{table:'events',value:{cover_image_url:body.cover_image_url},filters:[['id',id],['created_by','creator']]})
 global.filmDB=fixture({coverFail:true}).db;assert.equal((await route.POST(request(body))).status,500)
})
test('existing screening cover and trailer save/clear independently and reject non-screening targets',async()=>{
 const {route}=await modules();global.filmUser={id:'creator'};global.filmRole='admin'
 let f=fixture();global.filmDB=f.db
 assert.equal((await route.PATCH(request({eventId:id,action:'cover',cover_image_url:''}))).status,200)
 assert.deepEqual(f.writes[0].value,{cover_image_url:null})
 assert.equal((await route.PATCH(request({eventId:id,action:'trailer',trailer_url:'https://media.invalid/a.mp4'}))).status,200)
 assert.equal(f.writes[1].table,'film_club_screenings')
 f=fixture({missing:true});global.filmDB=f.db
 assert.equal((await route.PATCH(request({eventId:id,action:'cover',cover_image_url:'https://media.invalid/a.png'}))).status,404)
 assert.equal(f.writes.length,0)
})
