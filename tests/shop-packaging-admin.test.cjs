const{test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function fixture(role='admin'){
 const writes=[],context=vm.createContext({Response,console})
 const db={from(){const q={insert(p){writes.push(p);return q},update(p){writes.push(p);return q},eq(){return q},select(){return q},single:async()=>({data:{id:'product',...writes.at(-1)}})};return q}}
 const m=new vm.SourceTextModule(fs.readFileSync('app/api/admin/shop-products/route.js','utf8'),{context})
 await m.link(async spec=>{if(spec.endsWith('/shopPackaging')){const p=new vm.SourceTextModule(fs.readFileSync('lib/shopPackaging.js','utf8'),{context});await p.link(()=>{});return p}const values={requireUser:async()=>({id:'user'}),serviceClient:()=>db,memberOf:async()=>({role})};return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v)},{context})});await m.evaluate();return {api:m.namespace,writes}
}
test('admin create and edit persist selected packaging in existing product record',async()=>{const f=await fixture();for(const method of ['POST','PATCH']){const r=await f.api[method]({json:async()=>({id:'product',name:'Magazine',fulfillment:'manual',packaging_size:'media'})});assert.equal(r.status,200);assert.equal((await r.json()).product.packaging_size,'media')}assert.equal(f.writes.length,2)})
test('invalid packaging is rejected before a database write',async()=>{const f=await fixture();for(const method of ['POST','PATCH']){const r=await f.api[method]({json:async()=>({id:'product',name:'Magazine',packaging_size:'arbitrary'})});assert.equal(r.status,400)}assert.equal(f.writes.length,0)})
test('packaging edits retain the existing staff role gate',async()=>{const f=await fixture('member');const r=await f.api.PATCH({json:async()=>({id:'product',packaging_size:'large'})});assert.equal(r.status,403);assert.equal(f.writes.length,0)})
