const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const initial={event_id:'event',currency:'usd',ticket_price_cents:1000,member_discount_percent:20,host_share_percent:0,host_share_eligibility:'no',pricing_version:1,stripe_synced_version:null,sales_enabled:false,ticket_settings:{format:'live',fulfillment_method:'individual'},event:{title:'Film',status:'draft',is_public:true,starts_at:'2099-01-01',ends_at:'2099-01-02'}}
async function fixture({screening=initial,env={STRIPE_SECRET_KEY:'sk_test_fake',FILM_CLUB_TICKET_SALES_ENABLED:'true'},syncFailure=false,publishFailure=false,role='admin',user={id:'admin'}}={}){
 let state=structuredClone(screening);const calls=[]
 const db={from(){return{select(){return this},eq(){return this},update(patch){state={...state,...patch};return this},then(resolve){resolve({})},single:async()=>({data:structuredClone(state)})}},rpc:async(name,args)=>{
  calls.push(name)
  if(name==='save_film_ticket_settings'){
   const p=args.p_patch,changed=p.ticket_price_cents!==state.ticket_price_cents
   state={...state,...p,event:{...state.event,...p.event},pricing_version:state.pricing_version+(changed?1:0),sales_enabled:changed||p.event.status!=='published'?false:state.sales_enabled}
  }
  if(name==='mark_finished_film_archived')state.stripe_archived=true
  if(name==='set_film_ticket_sales')state.sales_enabled=args.p_enabled
  if(name==='publish_film_ticket_sales'){
   if(publishFailure)return{error:Error('version changed')}
   assert.equal(state.stripe_synced_version,args.p_version);state.event.status='published';state.event.is_public=true;state.sales_enabled=true
  }
  return{}
 }}
 class Stripe{constructor(){calls.push('stripe');this.products={retrieve:async()=>({metadata:{screening_id:'event'}}),update:async()=>calls.push('archive_product')};this.prices={list:()=>({async *[Symbol.asyncIterator](){yield{id:'price'}}}),update:async()=>calls.push('archive_price')}}}
 const ctx=vm.createContext({Response,console,Date,process:{env}}),cache=new Map()
 const mocks={'stripe':{default:Stripe},'../../../../../lib/apiAuth':{requireUser:async()=>user,memberOf:async()=>({role}),serviceClient:()=>db},'./filmTicketCommerce':{synchronizeFilmProduct:async()=>{calls.push('sync');if(syncFailure)throw Error('provider unavailable');state.stripe_product_id='prod_same';state.stripe_price_id='price_same';state.stripe_synced_version=state.pricing_version}},'../../../../../lib/filmTicketCommerce':{synchronizeFilmProduct(){throw Error('Legacy sync path')}}}
 async function module(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context:ctx});cache.set(file,m);await m.link(async spec=>{
  if(mocks[spec])return new vm.SyntheticModule(Object.keys(mocks[spec]),function(){for(const[k,v]of Object.entries(mocks[spec]))this.setExport(k,v)},{context:ctx})
  const name=spec.split('/').pop();return module(`lib/${name}.js`)
 });return m}
 const m=await module('app/api/admin/film-club/commerce/route.js');await m.evaluate()
 return{calls,get state(){return state},async post(action,patch={}){const body={eventId:'event',action,settings:{...structuredClone(state),...patch}};const res=await m.namespace.POST({json:async()=>body});return{status:res.status,...await res.json()}}}
}
test('saving a draft creates pricing automatically; repeated non-price saves reuse it without opening sales',async()=>{
 const f=await fixture();assert.equal((await f.post('settings')).status,200);assert.equal(f.state.event.status,'draft');assert.equal(f.state.sales_enabled,false);assert.equal(f.calls.filter(x=>x==='sync').length,1)
 assert.equal((await f.post('settings')).status,200);assert.equal(f.calls.filter(x=>x==='sync').length,1)
})
test('publish saves current settings, synchronizes, then atomically publishes and opens sales',async()=>{
 const f=await fixture();const r=await f.post('publish');assert.equal(r.status,200);assert.equal(f.state.sales_enabled,true);assert.equal(f.state.event.status,'published');assert.deepEqual(f.calls,['save_film_ticket_settings','stripe','sync','publish_film_ticket_sales'])
 assert.equal((await f.post('pause')).status,200);assert.equal(f.state.sales_enabled,false)
 assert.equal((await f.post('settings',{ticket_price_cents:1200})).status,200);assert.equal(f.state.sales_enabled,false)
})
test('active non-price saves stay open; price changes sync but stay paused until explicitly reopened',async()=>{
 const f=await fixture({screening:{...initial,event:{...initial.event,status:'published'},sales_enabled:true,stripe_product_id:'prod',stripe_price_id:'price',stripe_synced_version:1}})
 assert.equal((await f.post('settings')).status,200);assert.equal(f.state.sales_enabled,true);assert.ok(!f.calls.includes('stripe'))
 assert.equal((await f.post('settings',{ticket_price_cents:1200})).status,200);assert.equal(f.state.sales_enabled,false);assert.equal(f.state.stripe_synced_version,2)
})
test('Stripe failures report saved settings, keep drafts unpublished, and leave a retryable workflow',async()=>{
 for(const action of ['settings','publish']){const f=await fixture({syncFailure:true}),r=await f.post(action);assert.equal(r.status,409);assert.equal(r.saved,true);assert.equal(f.state.sales_enabled,false);assert.equal(f.state.event.status,'draft');assert.ok(!f.calls.includes('publish_film_ticket_sales'));assert.match(r.error,/Changes saved/)}
 const f=await fixture({publishFailure:true}),r=await f.post('publish');assert.equal(r.status,409);assert.equal(f.state.sales_enabled,false);assert.equal(f.state.event.status,'draft')
})
test('feature flag, dates and live Stripe guard prevent opening sales; pause never needs Stripe',async()=>{
 for(const options of [{env:{STRIPE_SECRET_KEY:'sk_test_fake'}},{screening:{...initial,event:{...initial.event,ends_at:null}}},{screening:{...initial,event:{...initial.event,starts_at:'2000-01-01',ends_at:'2000-01-02'}}}]){const f=await fixture(options);assert.equal((await f.post('publish')).status,409);assert.deepEqual(f.calls,[])}
 const f=await fixture({env:{STRIPE_SECRET_KEY:'sk_live_fake',FILM_CLUB_TICKET_SALES_ENABLED:'true'}});assert.equal((await f.post('publish')).status,409);assert.ok(!f.calls.includes('stripe'));assert.equal((await f.post('pause')).status,200)
})
test('archived/ended screenings save edits without resurrecting Stripe products; unauthorized users cannot mutate',async()=>{
 for(const s of [{...initial,stripe_archived:true},{...initial,event:{...initial.event,starts_at:'2000-01-01',ends_at:'2000-01-02'}}]){const f=await fixture({screening:s});assert.equal((await f.post('settings')).status,200);assert.ok(!f.calls.includes('stripe'))}
 for(const options of [{role:'member'},{user:null}]){const f=await fixture(options);assert.ok([401,403].includes((await f.post('settings')).status));assert.deepEqual(f.calls,[])}
})
test('an explicitly activated live integration uses the same workflow, without bypassing sales state',async()=>{
 const f=await fixture({env:{STRIPE_SECRET_KEY:'sk_live_fake',FILM_CLUB_LIVE_STRIPE_APPROVED:'true',FILM_CLUB_TICKET_SALES_ENABLED:'true'}})
 assert.equal((await f.post('settings')).status,200);assert.equal(f.state.sales_enabled,false);assert.equal((await f.post('publish')).status,200)
})
test('the request helper preserves the saved-settings indicator for recovery after provider failures',async()=>{
 const context=vm.createContext({fetch:async()=>({ok:false,json:async()=>({error:'Changes saved, but Stripe failed.',saved:true})})}),m=new vm.SourceTextModule(fs.readFileSync('lib/filmClubRequest.js','utf8'),{context})
 await m.link(()=>new vm.SyntheticModule(['createClient'],function(){this.setExport('createClient',()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-only'}}})}}))},{context}));await m.evaluate()
 await assert.rejects(()=>m.namespace.filmClubRequest('/api/admin/film-club/commerce','POST',{}),e=>e.saved===true&&/Changes saved/.test(e.message))
})

test('archive is rejected before the event ends and only finished Stripe products are archived',async()=>{
 for(const event of [initial.event,{...initial.event,ends_at:null}]){const f=await fixture({screening:{...initial,stripe_product_id:'prod',event}});assert.equal((await f.post('archive')).status,409);assert.deepEqual(f.calls,[])}
 const ended={...initial,stripe_product_id:'prod',event:{...initial.event,starts_at:'2000-01-01',ends_at:'2000-01-02'}}
 const f=await fixture({screening:ended});assert.equal((await f.post('archive')).status,200);assert.equal(f.state.stripe_archived,true);assert.ok(f.calls.indexOf('archive_price')<f.calls.indexOf('archive_product'));assert.ok(f.calls.includes('mark_finished_film_archived'))
 const done=await fixture({screening:{...ended,stripe_archived:true}});assert.equal((await done.post('archive')).status,200);assert.deepEqual(done.calls,[])
})
