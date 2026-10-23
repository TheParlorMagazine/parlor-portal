const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function endpoint(result,user={id:'owner'}){
 const filters=[]
 const db={from(table){assert.equal(table,'notifications');return {delete(){filters.push(['delete']);return this},eq(...args){filters.push(args);return this},in(...args){filters.push(args);return this},select:async fields=>{filters.push(['select',fields]);return result}}}}
 const ctx=vm.createContext({Response,console})
 const m=new vm.SourceTextModule(fs.readFileSync('app/api/portal/notifications/route.js','utf8'),{context:ctx})
 await m.link(async spec=>{const values=spec.endsWith('/apiAuth')?{requireUser:async()=>user,serviceClient:()=>db}:spec.endsWith('/notify')?{notifyAdmins(){}}:{CONSENT_VERSION:'test'};return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v)},{context:ctx})})
 await m.evaluate();return {run:body=>m.namespace.DELETE({json:async()=>body}),filters}
}
test('only confirmed deletion returns success and the deleted ID',async()=>{
 const {run,filters}=await endpoint({data:[{id:'draft'}]});const r=await run({id:'draft',member_id:'someone-else'});assert.equal(r.status,200);assert.equal((await r.json()).deleted_id,'draft');assert.ok(filters.some(f=>f[0]==='member_id'&&f[1]==='owner'));assert.ok(filters.some(f=>f[0]==='select'&&f[1]==='id'))
})
test('zero matching rows never report a successful delete',async()=>{const {run}=await endpoint({data:[]});const r=await run({id:'locked-or-missing'});assert.equal(r.status,409);assert.equal((await r.json()).ok,undefined)})
test('database rejection is surfaced instead of success',async()=>{const {run}=await endpoint({error:{message:'foreign key'}});assert.equal((await run({id:'draft'})).status,500)})
test('unauthenticated and missing-ID requests are rejected',async()=>{assert.equal((await(await endpoint({},null)).run({id:'draft'})).status,401);assert.equal((await(await endpoint({})).run({})).status,400)})

test('clear all is scoped to the signed-in member and includes read notifications',async()=>{
 const {run,filters}=await endpoint({data:[{id:'one'},{id:'two'}]});const r=await run({all:true,member_id:'other'});assert.equal(r.status,200);assert.equal((await r.json()).cleared_all,true);assert.ok(filters.some(f=>f[0]==='member_id'&&f[1]==='owner'));assert.equal(filters.some(f=>f[0]==='id'||f[0]==='read'),false)
})
test('clearing an empty list succeeds; database failures do not',async()=>{assert.equal((await(await endpoint({data:[]})).run({all:true})).status,200);assert.equal((await(await endpoint({error:{}})).run({all:true})).status,500)})
