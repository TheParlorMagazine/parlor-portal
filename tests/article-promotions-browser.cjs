const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'article-promos-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Promotions from './app/_components/ArticlePromotions';createRoot(document.getElementById('root')).render(<><main><header style={{height:50}}>Header</header><section style={{height:950}}>Hero</section><article style={{height:1500}}>Article</article><footer style={{height:200}}>End</footer></main><Promotions/></>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'}})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 const products=[{id:'choc',name:'Bones Marshmallow Hot Chocolate',images:['/choc.png']},{id:'jack',name:'Jacked O Lantern Coffee',images:['/jack.png']},{id:'col',name:'Bones Colombian Coffee',images:['/col.png']},{id:'other',name:'Unrelated product'}]
 try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.route('http://local.test/**',r=>{const u=r.request().url();return r.fulfill(u.endsWith('/api/shop/products')?{json:{products}}:u.endsWith('/api/trick-or-treat')?{json:{houses:[]}}:u.endsWith('.png')?{contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7x8AAAAASUVORK5CYII=','base64')}:{contentType:'text/html',body:'<div id="root"></div>'})})
 await page.goto('http://local.test/article');await page.addScriptTag({path:out});await page.locator('.bones-tile').first().waitFor({state:'attached'});assert.equal(await page.locator('.bones-tile').count(),3);assert.equal(await page.locator('.bones-banner.shown').count(),0)
 assert.deepEqual(await page.locator('.bones-tile').evaluateAll(tiles=>tiles.map(t=>t.getAttribute('href'))),['/shop/choc','/shop/jack','/shop/col'])
 await page.evaluate(()=>window.scrollTo(0,1100));await page.locator('.bones-banner.shown').waitFor();await page.locator(width>1100?'.tot-strip.shown':'.tot-mob.shown').waitFor();
 if(width>1100){const r=await page.locator('.bones-banner').boundingBox();assert.ok(r.x>width/2+360);const tiles=await page.locator('.bones-tile').all();assert.ok((await tiles[1].boundingBox()).y>(await tiles[0].boundingBox()).y)}
 else{await page.waitForFunction(()=>{const r=document.querySelector('.bones-banner').getBoundingClientRect();return Math.round(r.bottom)===innerHeight});const tiles=await page.locator('.bones-tile').all();assert.ok((await tiles[1].boundingBox()).x>(await tiles[0].boundingBox()).x)}
 await page.evaluate(()=>window.scrollTo(0,2600));await page.waitForFunction(()=>!document.querySelector('.bones-banner').classList.contains('shown'));assert.equal(await page.locator(width>1100?'.tot-strip.shown':'.tot-mob.shown').count(),0)
 assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS requested product data/links, desktop vertical/mobile bottom layouts, synchronized appearance and disappearance')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
