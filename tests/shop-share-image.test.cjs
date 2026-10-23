const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild')
async function endpoint(){const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'shop-share-')),'route.cjs');await build({entryPoints:['app/shop/share-image/route.js'],bundle:true,outfile:out,platform:'node',format:'cjs',packages:'external',jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'db',setup(b){b.onResolve({filter:/lib\/apiAuth$/},()=>({path:'db',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const serviceClient=()=>global.shopShareDB;'}))}}]});return require(out)}
function db(data,error){return{from(table){assert.equal(table,'shop_products');return{select(){return this},eq(k,v){assert.equal(k,'active');assert.equal(v,true);return this},order(){return this},then(resolve){resolve({data,error})}}}}}
test('shop PNG selects six unique active products and prioritizes featured/Bones picks',async()=>{
 const api=await endpoint(),names=['Other item','Marshmallow Hot Chocolate','Jacked O Lantern Coffee','Bones Colombian Coffee','Magazine','Tote','Extra'],images=[]
 global.shopShareDB=db(names.map((name,id)=>({id,name,images:[`https://res.cloudinary.com/test/${id}.png`],featured:id===4})))
 const originalFetch=global.fetch;global.fetch=async (...args)=>{const url=args[0];if(!String(url).startsWith('https://res.cloudinary.com/'))return originalFetch(...args);images.push(String(url));return new Response(fs.readFileSync('public/birthday-gift-thumbnail.png'),{headers:{'content-type':'image/png'}})}
 try{const response=await api.GET();assert.equal(response.headers.get('content-type'),'image/png');const png=Buffer.from(await response.arrayBuffer());assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);assert.deepEqual(images.map(u=>Number(u.match(/(\d+)\.png/)[1])),[4,1,2,3,0,5]);fs.writeFileSync('/tmp/parlor-shop-share-preview.png',png)}finally{global.fetch=originalFetch}
})
test('empty/error catalogues still produce a branded PNG',async()=>{
 const api=await endpoint();for(const error of [null,{message:'Unavailable'}]){global.shopShareDB=db([],error);const response=await api.GET();assert.equal(response.status,200);assert.ok((await response.arrayBuffer()).byteLength>1000);if(error)assert.equal(response.headers.get('cache-control'),'public, max-age=60')}
})
