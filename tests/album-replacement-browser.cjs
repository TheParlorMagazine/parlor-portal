const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'album-replacement-')),'bundle.js')
 const original=[{src:'/missing-one.png',caption:'Original caption one',alt:'Alt one',credit:'Photo credit'},{src:'/missing-two.png',caption:'Original caption two',alt:'Alt two'},{src:'/missing-three.png',caption:'Original caption three',alt:'Alt three'}]
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{AlbumInsertModal}from'./app/admin/articles/_components/AlbumBlockExtension';import Editor from './app/admin/articles/_components/RichTextEditor';const initial=${JSON.stringify(original)};createRoot(document.getElementById('root')).render(location.pathname==='/single'?<Editor content={'<p>Before</p><img src="/missing-one.png" alt="Alt one" data-caption="Original caption one"><p>After</p>'} onChange={html=>window.savedHTML=html}/>:<AlbumInsertModal mode="edit" initialLayout="grid-3" initialImages={initial} onInsert={value=>window.saved=value} onClose={()=>window.closed=true}/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'mock',setup(b){b.onResolve({filter:/lib\/supabase$|lib\/uploadImage$|_components\/ImageEditor$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('/supabase')?`export const createClient=()=>({storage:{from:()=>({list:async()=>({data:[{name:'replacement.png'}]}),getPublicUrl:()=>({data:{publicUrl:'/replacement.png'}})})}});`:a.path.endsWith('/uploadImage')?`export const uploadToCloudinary=async()=>{if(location.pathname==='/failure')throw new Error('Upload failed');return '/uploaded.png'};export const isDuplicateUpload=()=>false;export const prepareImageUpload=async()=>{};`:`export default function ImageEditor(){return null}`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const scenario of ['library','upload','drop','failure','cancel','single']){
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('http://local.test/**',r=>r.fulfill(r.request().url().endsWith('.png')?{status:404,body:''}:{contentType:'text/html',body:'<div id="root"></div>'}))
 await page.goto('http://local.test/'+scenario);await page.addScriptTag({path:out})
 if(scenario==='single'){
  await page.locator('.ProseMirror img').click({button:'right'});await page.getByRole('button',{name:'Replace Image',exact:true}).click()
 }else await page.getByRole('button',{name:'Change image 2',exact:true}).click()
 if(scenario==='single')await page.getByText('Media Library',{exact:true}).waitFor();else{await page.getByLabel('Replacement drop zone for image 2',{exact:true}).waitFor();assert.equal(await page.getByText('Media Library',{exact:true}).count(),0)}
 if(scenario==='upload'||scenario==='failure'){
  await page.getByLabel('Upload replacement image',{exact:true}).setInputFiles({name:'new.png',mimeType:'image/png',buffer:Buffer.from('test')})
  if(scenario==='failure'){await page.getByRole('alert').filter({hasText:'Upload failed'}).waitFor();await page.getByRole('button',{name:'Cancel replacement',exact:true}).click()}
  else await page.getByLabel('Replacement drop zone for image 2',{exact:true}).waitFor({state:'detached'})
 }else if(scenario==='drop'){
  const data=await page.evaluateHandle(()=>{const dt=new DataTransfer();dt.items.add(new File(['test'],'drop.png',{type:'image/png'}));return dt})
  await page.getByLabel('Replacement drop zone for image 2',{exact:true}).dispatchEvent('drop',{dataTransfer:data});await page.getByLabel('Replacement drop zone for image 2',{exact:true}).waitFor({state:'detached'})
 }else if(scenario==='cancel')await page.getByRole('button',{name:'Cancel replacement',exact:true}).click()
 else await page.getByAltText('replacement.png',{exact:true}).last().locator('..').click()
 if(scenario==='single'){
  await page.waitForFunction(()=>window.savedHTML?.includes('/replacement.png'));const html=await page.evaluate(()=>window.savedHTML);assert.equal((html.match(/<img /g)||[]).length,1);assert.ok(html.includes('data-caption="Original caption one"'));assert.ok(html.includes('alt="Alt one"'));assert.ok(html.includes('Before')&&html.includes('After'))
 }else{
  await page.getByRole('button',{name:'Save Changes (3)',exact:true}).click();const result=await page.evaluate(()=>window.saved);assert.equal(result.layout,'grid-3');const expected=structuredClone(original);if(['library','upload','drop'].includes(scenario))expected[1].src=scenario==='library'?'/replacement.png':'/uploaded.png';assert.deepEqual(result.images,expected)
 }
 assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS album library/upload replacement preserves captions, alt text, credit, order/layout; cancellation preserves originals; standalone replacement retains one image and caption')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
