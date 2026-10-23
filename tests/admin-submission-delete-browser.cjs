const fs=require('fs'),os=require('os'),path=require('path'),assert=require('node:assert/strict')
const base='/tmp/parlor-tour-validation/node_modules', {build}=require(base+'/esbuild'),{chromium}=require(base+'/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'admin-delete-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Section from './app/admin/_components/CommunityPostsSection';createRoot(document.getElementById('root')).render(<Section supabase={{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}}}/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'confirm',setup(b){b.onResolve({filter:/lib\/confirmDialog$/},()=>({path:'confirm',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const confirmDialog=async()=>true;export const alertDialog=async()=>{}'}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const fails of [false,true]){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let rows=[{id:'post',title:'Removed post',status:'removed',author_name:'Member',created_at:'2026-10-23'}]
 await page.route('http://parlor.test/**',async r=>{if(r.request().url().includes('/api/admin/submissions')){
 if(r.request().method()==='DELETE'){if(fails)return r.fulfill({status:500,json:{error:'Could not delete this post.'}});rows=[];return r.fulfill({json:{ok:true,deleted_id:'post'}})}
 return r.fulfill({json:{submissions:rows}})}return r.fulfill({contentType:'text/html',body:'<div id="root"></div>'})})
 await page.goto('http://parlor.test/admin');await page.addScriptTag({path:out});await page.getByRole('button',{name:'Delete',exact:true}).click()
 if(fails){await page.getByRole('alert').waitFor();assert.equal(await page.getByText('Removed post',{exact:true}).count(),1)}else{await page.getByText('No submissions yet.',{exact:true}).waitFor();await page.reload();await page.addScriptTag({path:out});await page.getByText('No submissions yet.',{exact:true}).waitFor()}
 assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS admin list deletion, persistence after refresh, and failure preserves row')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
