const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function api({user={id:'admin'},role='admin',rows=[],error=null}={}) {
 const filters=[]
 const db={from(table){assert.equal(table,'members');return {select(){return this},or(value){filters.push(value);return this},limit:async()=>({data:rows,error})}}}
 const context=vm.createContext({Response,URL})
 const mod=new vm.SourceTextModule(fs.readFileSync('app/api/admin/roles/route.js','utf8'),{context})
 await mod.link(()=>new vm.SyntheticModule(['requireUser','serviceClient','memberOf'],function(){this.setExport('requireUser',async()=>user);this.setExport('serviceClient',()=>db);this.setExport('memberOf',async()=>role?{role}:null)},{context}))
 await mod.evaluate()
 return {filters,search:q=>mod.namespace.GET({url:'https://local.test/api/admin/roles?q='+encodeURIComponent(q)})}
}
test('full email keeps periods and returns subscriber',async()=>{
 const email='alexandria@theparlormagazine.com',member={id:'cofounder',email,role:null}
 const {search,filters}=await api({rows:[member]});const res=await search(email)
 assert.equal(res.status,200);assert.deepEqual((await res.json()).members,[member]);assert.equal(filters[0],`email.ilike.${JSON.stringify('%'+email+'%')},full_name.ilike.${JSON.stringify('%'+email+'%')}`)
})
test('punctuated names and emails are quoted; wildcard characters stay literal',async()=>{
 for(const term of ['first.last+team@example.com','Doe, Jane (Editor)','a_b%"\\x']){
 const {search,filters}=await api();await search(term)
 const expected=JSON.stringify('%'+term.replace(/[\\%_]/g,'\\$&')+'%');assert.equal(filters[0],`email.ilike.${expected},full_name.ilike.${expected}`)
 }
})
test('ordinary members and missing member records cannot search; no database queries',async()=>{
 for(const options of [{user:null},{role:'member'},{role:null}]){const{search,filters}=await api(options);assert.ok([401,403].includes((await search('alexandria')).status));assert.equal(filters.length,0)}
})
test('empty input, search limit, database errors, and existing team members are handled',async()=>{
 const a=await api();assert.deepEqual((await(await a.search('   ')).json()).members,[]);assert.equal(a.filters.length,0);assert.equal((await a.search('a'.repeat(151))).status,400)
 assert.equal((await(await api({error:{message:'error'}})).search('alex')).status,500)
 const b=await api({rows:[{id:'staff',role:'admin'},{id:'subscriber',role:null}]});assert.deepEqual((await(await b.search('alex')).json()).members,[{id:'subscriber',role:null}])
})
