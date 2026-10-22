const {test}=require('node:test')
const assert=require('node:assert/strict')
const vm=require('node:vm')
const fs=require('node:fs')
async function load(path,mocks={}) {
 const context=vm.createContext({Response,Date,console})
 const module=new vm.SourceTextModule(fs.readFileSync(path,'utf8'),{context})
 await module.link(async spec=>{
  if(spec.endsWith('/portalTour')) return loadInto(context,'lib/portalTour.js')
  const values=mocks[spec]; assert.ok(values,spec)
  return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v)},{context})
 })
 await module.evaluate();return module.namespace
}
async function loadInto(context,path){const m=new vm.SourceTextModule(fs.readFileSync(path,'utf8'),{context});await m.link(()=>{});return m}
const auth='../../../../lib/apiAuth'
test('tour chapters end in the Archive and never target submission/payment controls',async()=>{
 const m=await load('lib/portalTour.js')
 assert.equal(m.TOUR_STEPS.length,5);assert.equal(m.TOUR_STEPS[4].path,'/portal/library')
 for(const step of m.TOUR_STEPS)assert.ok(!/checkout|rsvp|approve|submit/.test(step.selector))
})
test('only eligible new dashboard visitors receive automatic invitations',async()=>{
 const m=await load('lib/portalTour.js')
 assert.equal(m.shouldOfferTour({eligible:true,status:'not_started'},'/portal'),true)
 for(const status of ['in_progress','postponed','skipped','completed'])assert.equal(m.shouldOfferTour({eligible:true,status},'/portal'),false)
 assert.equal(m.shouldOfferTour({eligible:false,status:'not_started'},'/portal'),false)
 assert.equal(m.shouldOfferTour({eligible:true,status:'not_started'},'/auth/callback'),false)
})
test('progress API rejects unauthenticated access before touching database',async()=>{
 const m=await load('app/api/portal/tour/route.js',{[auth]:{requireUser:async()=>null,serviceClient(){throw Error('Unexpected database access')}}})
 assert.equal((await m.GET({})).status,401);assert.equal((await m.PATCH({})).status,401)
})
test('progress validation rejects invalid status, step, and version',async()=>{
 const m=await load('app/api/portal/tour/route.js',{[auth]:{requireUser:async()=>({id:'self'}),serviceClient(){throw Error('Unexpected database access')}}})
 for(const body of [{status:'paid',version:1,step:0},{status:'completed',version:1,step:5},{status:'skipped',version:2,step:0}]){
 assert.equal((await m.PATCH({json:async()=>body})).status,400)
 }
})
test('progress updates use verified owner and allowlisted fields only',async()=>{
 let saved
 const db={from(table){assert.equal(table,'member_portal_tour_state');return {upsert(row){saved=row;return {select(){return {single:async()=>({data:row})}}}}}}}
 const m=await load('app/api/portal/tour/route.js',{[auth]:{requireUser:async()=>({id:'self'}),serviceClient:()=>db}})
 const response=await m.PATCH({json:async()=>({member_id:'someone-else',status:'completed',step:4,version:1,role:'admin',plan:'paid',completed_at:'forged'})})
 assert.equal(response.status,200);assert.equal(saved.member_id,'self');assert.equal(saved.plan,undefined);assert.equal(saved.role,undefined);assert.notEqual(saved.completed_at,'forged')
})
test('missing migration returns a nonblocking progress-unavailable response',async()=>{
 const db={from(){return {select(){return this},eq(){return this},single:async()=>({error:{code:'42P01'}})}}}
 const m=await load('app/api/portal/tour/route.js',{[auth]:{requireUser:async()=>({id:'self'}),serviceClient:()=>db}})
 assert.equal((await m.GET({})).status,503)
})
