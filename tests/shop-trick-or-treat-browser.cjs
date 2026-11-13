const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict')
const {build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'shop-banner-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Shop from './app/_components/ShopTrickOrTreatPopup';import Article from './app/_components/TrickOrTreatStrip';createRoot(document.getElementById('root')).render(<><section id="shop-featured-product" style={{height:950}}>Featured product</section><div style={{height:2000}}>Collection</div>{location.pathname==='/article'?<Article heroSelector="#shop-featured-product" bottomSelector="#absent"/>:<Shop/>}</>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'}})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('http://local.test/**',r=>r.fulfill(r.request().url().includes('/api/announcements/shop-popup')?{json:{announcement:{active:true}}}:r.request().url().endsWith('/api/trick-or-treat')?{json:{houses:[]}}:{contentType:'text/html',body:'<div id="root"></div>'}))
  async function load(url){await page.goto('http://local.test'+url);await page.addScriptTag({path:out});await page.locator('#shop-featured-product').waitFor()}
  await load('/shop');await page.locator('.tot-shop-popup').waitFor({state:'attached'})
  if(width>1100){await page.locator('.tot-shop-popup.shown').waitFor();const box=await page.locator('.tot-shop-popup').boundingBox();assert.equal(box.x,16);assert.equal(Math.round(box.y+box.height),884);assert.equal(box.width,280)
   await page.evaluate(()=>localStorage.setItem('parlor_cookie_consent',JSON.stringify({version:1,analytics:false,savedAt:Date.now()})))
   await page.addScriptTag({path:path.join(process.cwd(),'public/cookie-consent.js')})
   const separated=()=>{const popup=document.querySelector('.tot-shop-popup').getBoundingClientRect(),button=document.querySelector('.parlor-cookie-reopen').getBoundingClientRect();return Math.abs(button.top-popup.bottom-12)<1}
   await page.waitForFunction(separated)
   await page.evaluate(()=>{const ribbon=document.createElement('div');ribbon.className='ribbon';ribbon.style.cssText='position:fixed;bottom:0;left:0;width:100%;height:80px';document.body.append(ribbon)})
   await page.waitForFunction(()=>parseInt(document.querySelector('.parlor-cookie-reopen').style.getPropertyValue('--parlor-cookie-bottom'))>=92)
   await page.waitForFunction(separated)
   await page.evaluate(()=>document.querySelector('.ribbon').remove())
   await page.waitForFunction(separated)
  }
  else{await page.locator('.tot-shop-mobile.hidden').waitFor({state:'attached'});await page.evaluate(()=>window.scrollTo(0,1100));await page.locator('.tot-shop-mobile.shown').waitFor();await page.waitForFunction(()=>Math.round(document.querySelector('.tot-shop-mobile').getBoundingClientRect().y)===0)}
  const close=page.locator(width>1100?'.tot-shop-popup .tot-shop-dismiss':'.tot-shop-mobile .tot-shop-dismiss');await close.click();assert.equal(page.url(),'http://local.test/shop');assert.equal(await page.locator('.tot-shop-popup').count(),0)
  await load('/shop');assert.equal(await page.locator('.tot-shop-popup').count(),0)
  await load('/article');await page.evaluate(()=>window.scrollTo(0,1100));await page.locator(width>1100?'.tot-strip.shown':'.tot-mob.shown').waitFor();assert.equal(await page.getByRole('button',{name:'Dismiss shop Trick or Treat banner'}).count(),0);assert.equal(await page.locator('.tot-shop-popup').count(),0)
  assert.deepEqual(errors,[]);await ctx.close()
 }console.log('PASS desktop popup stacks 12px above cookie preferences and follows ribbon changes; original desktop placement, mobile scroll trigger, session dismissal, and original article banner unaffected')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
