const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),fs=require('node:fs')
const {build}=require('/tmp/parlor-tour-validation/node_modules/esbuild')
const {renderToStaticMarkup}=require('react-dom/server')
const id='11111111-1111-4111-8111-111111111111'
let compiled
async function modules(){return compiled ||= (async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'film-media-')),result={}
 for(const [key,entry] of Object.entries({subscribers:'app/api/admin/film-club/subscribers/route.js',contacts:'lib/filmScreeningSubscribers.js',helper:'lib/filmClubMedia.js',route:'app/api/admin/film-club/route.js',player:'app/_components/FilmTrailer.js'})){
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

test('forum visibility changes listing and archive flags together without changing commenting',async()=>{
 const {route}=await modules();global.filmUser={id:'creator'};global.filmRole='editor'
 const writes=[];global.filmDB={from(table){const q={update(value){writes.push({table,value});return q},eq(){return q},not(){return q},select(){return q},maybeSingle:async()=>({data:{event_id:id}})};return q}}
 for(const visible of [false,true]){assert.equal((await route.PATCH(request({eventId:id,action:'forum_visibility',visible}))).status,200);assert.deepEqual(writes.at(-1).value,{discussion_active:visible,discussion_archived:!visible})}
 assert.equal((await route.PATCH(request({eventId:id,action:'forum_visibility',visible:'yes'}))).status,400)
})
test('forum deletion requires an admin, confirmation and matching screening link; deletes only the forum',async()=>{
 const {route}=await modules(),forum='22222222-2222-4222-8222-222222222222',deleted=[]
 global.filmUser={id:'creator'};const body={eventId:id,forumId:forum,confirm:true}
 global.filmRole='editor';assert.equal((await route.DELETE(request(body))).status,403)
 global.filmUser=null;assert.equal((await route.DELETE(request(body))).status,401);global.filmUser={id:'creator'};global.filmRole='admin'
 let failure=false
 global.filmDB={from(table){const filters=[];let removing=false;const q={select(){return q},eq(key,value){filters.push([key,value]);return q},delete(){removing=true;return q},async maybeSingle(){if(removing){deleted.push({table,filters});return failure?{error:{message:'blocked'}}:{data:{id:forum}}}return{data:{forum_id:forum}}}};return q}}
 assert.equal((await route.DELETE(request({...body,confirm:false}))).status,400)
 assert.equal((await route.DELETE(request({...body,forumId:id}))).status,404);assert.equal(deleted.length,0)
 assert.equal((await route.DELETE(request(body))).status,200);assert.deepEqual(deleted,[{table:'forums',filters:[['id',forum]]}])
 failure=true;assert.equal((await route.DELETE(request(body))).status,500)
})

function contactDB(initial=[],authUsers=[]){
 const members=initial.map(m=>({...m})),buyers=[],calls=[];let next=0
 const db={auth:{admin:{listUsers:async()=>{calls.push('listUsers');return{data:{users:authUsers}}},createUser:async({email})=>{calls.push('createUser');const user={id:'new-'+(++next),email};authUsers.push(user);return{data:{user}}}}},from(table){let email,patch,options;const q={select(){return q},ilike(key,value){email=value.replaceAll('\\_','_').replaceAll('\\%','%');return q},async maybeSingle(){return{data:members.find(m=>m.email.toLowerCase()===email)||null}},upsert(value,opts){patch=value;options=opts;return q},then(resolve){calls.push(table);if(table==='members'){const old=members.find(m=>m.id===patch.id);if(!old)members.push(patch);else if(!options?.ignoreDuplicates)Object.assign(old,patch)}else if(!buyers.some(b=>b.event_id===patch.event_id&&b.email===patch.email))buyers.push(patch);return Promise.resolve({}).then(resolve)}};return q}}
 return{db,members,buyers,calls}
}
test('screening contacts create free subscribed accounts without email sends and additions are idempotent',async()=>{
 const {contacts}=await modules(),f=contactDB();const member=await contacts.addScreeningSubscriber(f.db,id,{email:' New@Example.com ',full_name:'New Reader'})
 assert.equal(member.plan,'free');assert.equal(member.newsletter_subscribed,true);assert.equal(member.email,'new@example.com');assert.equal(member.full_name,'New Reader')
 await contacts.addScreeningSubscriber(f.db,id,{email:'new@example.com'});assert.equal(f.members.length,1);assert.equal(f.buyers.length,1);assert.equal(f.calls.filter(c=>c==='createUser').length,1)
})
test('adding existing screening contacts preserves paid membership and opt-outs; reuses existing auth accounts',async()=>{
 const {contacts}=await modules(),old={id:'paid',email:'paid@example.com',plan:'Printing Press',newsletter_subscribed:false,unsubscribed_at:'2026-01-01'},f=contactDB([old]);await contacts.addScreeningSubscriber(f.db,id,{email:old.email,full_name:'Replacement'});assert.deepEqual(f.members,[old]);assert.deepEqual(f.calls,['film_club_ticket_buyers'])
 const orphan=contactDB([],[{id:'auth-existing',email:'known@example.com'}]);await contacts.addScreeningSubscriber(orphan.db,id,{email:'known@example.com'});assert.equal(orphan.members[0].id,'auth-existing');assert.equal(orphan.calls.includes('createUser'),false)
 await assert.rejects(()=>contacts.addScreeningSubscriber(f.db,id,{email:'invalid'}),/valid email/)
})

test('screening subscriber endpoint authorizes and validates screening before adding contacts',async()=>{
 const {subscribers}=await modules(),body={eventId:id,email:'paid@example.com'}
 global.filmDB={from(){throw Error('must not query')}};global.filmUser=null;assert.equal((await subscribers.POST(request(body))).status,401)
 global.filmUser={id:'creator'};global.filmRole='member';assert.equal((await subscribers.POST(request(body))).status,403)
 global.filmRole='admin';assert.equal((await subscribers.POST(request({...body,eventId:'bad'}))).status,400)
 const f=contactDB([{id:'paid',email:body.email,plan:'Reader Circle',newsletter_subscribed:true}]);const from=f.db.from.bind(f.db);f.db.from=table=>table==='film_club_screenings'?{select(){return this},eq(){return this},maybeSingle:async()=>({data:{event_id:id}})}:from(table);global.filmDB=f.db
 assert.equal((await subscribers.POST(request(body))).status,200);assert.equal(f.buyers.length,1);assert.equal(f.calls.includes('createUser'),false)
 global.filmDB={from(){return{select(){return this},eq(){return this},maybeSingle:async()=>({data:null})}}};assert.equal((await subscribers.POST(request(body))).status,404)
})

test('screening subscriber list combines paid purchasers and external contacts once, and searches existing contacts',async()=>{
 const {subscribers}=await modules();global.filmUser={id:'creator'};global.filmRole='editor';const queries=[]
 const member={id:'reader',full_name:'Reader',email:'reader@example.com',plan:'free',newsletter_subscribed:false,unsubscribed_at:'2026-01-01'}
 global.filmDB={from(table){const entry={table};queries.push(entry);const q={select(columns){entry.columns=columns;return q},eq(){return q},order(){return q},in(key,values){entry[key]=values;return q},or(value){entry.search=value;return q},async maybeSingle(){return{data:{event_id:id}}},async range(){return{data:table==='film_club_ticket_buyers'?[{email:member.email}]:[{member}]}},async limit(){return{data:[{id:member.id,email:member.email,plan:member.plan}]}},then(resolve){return Promise.resolve({data:[member]}).then(resolve)}};return q}}
 const response=await subscribers.GET({url:'https://fixture.test/?eventId='+id});assert.equal(response.status,200);const body=await response.json();assert.equal(body.subscribers.length,1);assert.equal(body.subscribers[0].source,'Parlor ticket');assert.equal(body.subscribers[0].newsletter_subscribed,false);assert.deepEqual(queries.find(q=>q.table==='film_club_tickets').payment_status,['paid','partially_refunded'])
 const result=await subscribers.GET({url:'https://fixture.test/?eventId='+id+'&q=Reader'});assert.equal((await result.json()).members.length,1)
})

test('new-contact submissions reject existing subscribers and auth accounts without changing or adding them',async()=>{
 const {contacts}=await modules(),old={id:'paid',email:'paid@example.com',plan:'Printing Press',newsletter_subscribed:false},f=contactDB([old])
 await assert.rejects(()=>contacts.addScreeningSubscriber(f.db,id,{email:' PAID@example.com ',full_name:'Replacement',createNew:true}),/Subscriber already exists/)
 assert.deepEqual(f.members,[old]);assert.deepEqual(f.buyers,[]);assert.deepEqual(f.calls,[])
 const orphan=contactDB([],[{id:'known',email:'known@example.com'}]);await assert.rejects(()=>contacts.addScreeningSubscriber(orphan.db,id,{email:'known@example.com',createNew:true}),/Subscriber already exists/);assert.equal(orphan.calls.includes('createUser'),false);assert.equal(orphan.members.length,0)
 const fresh=contactDB();await contacts.addScreeningSubscriber(fresh.db,id,{email:'new@example.com',createNew:true});assert.equal(fresh.members.length,1);assert.equal(fresh.buyers.length,1)
})
