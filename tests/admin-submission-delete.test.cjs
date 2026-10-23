const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function endpoint(result,user={id:'owner'},role='admin'){
 const filters=[]
 const db={from(table){assert.equal(table,'member_submissions');return {delete(){filters.push(['delete']);return this},eq(...args){filters.push(args);return this},in(...args){filters.push(args);return this},select:async fields=>{filters.push(['select',fields]);return result}}}}
 const ctx=vm.createContext({Response,console})
 const m=new vm.SourceTextModule(fs.readFileSync('app/api/admin/submissions/route.js','utf8'),{context:ctx})
 await m.link(async spec=>{const values=spec.endsWith('/apiAuth')?{requireUser:async()=>user,serviceClient:()=>db,memberOf:async()=>({role})}:spec.endsWith('/notify')?{notifyMember(){}}:{withDisclaimer:s=>s};return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v)},{context:ctx})})
 await m.evaluate();return {run:body=>m.namespace.DELETE({json:async()=>body}),filters}
}
test('authorized deletion confirms exactly one deleted submission',async()=>{
 const {run,filters}=await endpoint({data:[{id:'post'}]});const r=await run({id:'post'});assert.equal(r.status,200);assert.equal((await r.json()).deleted_id,'post');assert.ok(filters.some(f=>f[0]==='id'&&f[1]==='post'))
})
test('ordinary members cannot delete admin submissions',async()=>{const {run,filters}=await endpoint({}, {id:'member'},'member');assert.equal((await run({id:'post'})).status,403);assert.equal(filters.length,0)})
test('editors retain existing moderation access',async()=>{const {run}=await endpoint({data:[{id:'post'}]}, {id:'editor'},'editor');assert.equal((await run({id:'post'})).status,200)})
test('zero matching rows never report a successful delete',async()=>{const {run}=await endpoint({data:[]});const r=await run({id:'locked-or-missing'});assert.equal(r.status,409);assert.equal((await r.json()).ok,undefined)})
test('database rejection is surfaced instead of success',async()=>{const {run}=await endpoint({error:{message:'foreign key'}});assert.equal((await run({id:'draft'})).status,500)})
test('unauthenticated and missing-ID requests are rejected',async()=>{assert.equal((await(await endpoint({},null)).run({id:'draft'})).status,401);assert.equal((await(await endpoint({})).run({})).status,400)})
