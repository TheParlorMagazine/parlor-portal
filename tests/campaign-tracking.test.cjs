const{test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{Webhook}=require('svix')
const secret='whsec_'+Buffer.alloc(32,7).toString('base64'),campaignId='00000000-0000-0000-0000-000000000001'
async function load(file,mocks,env={}){const context=vm.createContext({console,URL,Date,Response,process:{env}});const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});await m.link(spec=>{const v=mocks[spec];if(!v)throw Error(spec);return new vm.SyntheticModule(Object.keys(v),function(){for(const[k,value]of Object.entries(v))this.setExport(k,value)},{context})});await m.evaluate();return m.namespace}
async function webhook({dbError=false,configured=true}={}) {
 const rows=new Map(), parser=await load('lib/campaignTracking.js',{})
 let dbCalls=0
 const db={from(){return{upsert:async(row,options)=>{
   assert.equal(options.ignoreDuplicates,true)
   if(!rows.has(row.event_id))rows.set(row.event_id,row)
   return{error:dbError?{message:'DB down'}:null}
 }}}}
 const h=await load('app/api/webhooks/resend/route.js',{
  'svix':{Webhook},
  '../../../../lib/campaignTracking':{trackingEvent:parser.trackingEvent},
  '../../../../lib/apiAuth':{serviceClient:()=>{dbCalls++;return db}},
 }, configured?{RESEND_WEBHOOK_SECRET:secret}:{})
 return{h,rows,get dbCalls(){return dbCalls}}
}

function signed(payload,{id='msg_signed',timestamp=new Date(),forged=false}={}){const raw=JSON.stringify(payload),signature=new Webhook(secret).sign(id,timestamp,raw);return new Request('https://example.test/api/webhooks/resend',{method:'POST',headers:{'svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':forged?'v1,invalid':signature},body:raw})}
const event=(type='email.opened')=>({type,created_at:new Date().toISOString(),data:{email_id:'email-provider-id'}})
test('signed events persist and duplicate notifications do not duplicate records',async()=>{const f=await webhook(),payload=event();assert.equal((await f.h.POST(signed(payload))).status,200);assert.equal((await f.h.POST(signed(payload))).status,200);assert.equal(f.rows.size,1);assert.equal(f.rows.get('msg_signed').provider_email_id,'email-provider-id')})
test('forged, stale and unconfigured webhooks never access the database',async()=>{for(const options of [{forged:true},{timestamp:new Date(Date.now()-10*60*1000)}]){const f=await webhook();assert.equal((await f.h.POST(signed(event(),options))).status,401);assert.equal(f.dbCalls,0)}const f=await webhook({configured:false});assert.equal((await f.h.POST(signed(event()))).status,503);assert.equal(f.dbCalls,0)})
test('click tracking strips personal query strings and does not retain IP or user agent',async()=>{const f=await webhook(),payload=event('email.clicked');payload.data.click={link:'https://user:pass@example.test/post/story?token=private#fragment',ipAddress:'192.0.2.1',userAgent:'Example'};await f.h.POST(signed(payload));const row=f.rows.get('msg_signed');assert.equal(row.link,'https://example.test/post/story');assert.equal(Object.keys(row).length,5);assert.equal(row.ipAddress,undefined)})
test('unrelated event types are acknowledged, malformed tracking events rejected and DB errors retryable',async()=>{let f=await webhook();assert.equal((await f.h.POST(signed(event('email.sent')))).status,200);assert.equal(f.dbCalls,0);const malformed=event();delete malformed.data.email_id;assert.equal((await f.h.POST(signed(malformed))).status,400);f=await webhook({dbError:true});assert.equal((await f.h.POST(signed(event()))).status,503)})
async function metrics(user,role='admin',error=null){let rpcCalls=0;const h=await load('app/api/admin/campaigns/metrics/route.js',{'../../../../../lib/apiAuth':{requireUser:async()=>user,serviceClient:()=>({rpc:async(name,args)=>{rpcCalls++;assert.equal(name,'campaign_tracking_stats');return{data:[{campaign_id:args.p_campaign_ids[0],tracked:true,accepted_count:2,open_count:1}],error}}}),memberOf:async()=>({role})}});return{h,get rpcCalls(){return rpcCalls}}}
test('metrics require staff authorization and validate campaign IDs',async()=>{for(const[user,role,status]of [[null,'admin',401],[{id:'reader'},'member',403]]){const f=await metrics(user,role);assert.equal((await f.h.GET(new Request('https://example.test/metrics?ids='+campaignId))).status,status);assert.equal(f.rpcCalls,0)}const f=await metrics({id:'staff'});assert.equal((await f.h.GET(new Request('https://example.test/metrics?ids=invalid'))).status,400);assert.equal(f.rpcCalls,0)})
test('authorized metrics are private and unavailable tracking is never returned as zero engagement',async()=>{let f=await metrics({id:'staff'});const r=await f.h.GET(new Request('https://example.test/metrics?ids='+campaignId));assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal((await r.json()).metrics[0].open_count,1);f=await metrics({id:'staff'},'admin',{message:'Missing migration'});assert.equal((await f.h.GET(new Request('https://example.test/metrics?ids='+campaignId))).status,503)})
