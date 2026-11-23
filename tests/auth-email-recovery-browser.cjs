const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict')
const {build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'email-recovery-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Wall from './app/post/[slug]/_components/SubscribeWall';import Resend from './app/_components/ResendConfirmation';createRoot(document.getElementById('root')).render(location.pathname==='/resend'?<Resend email="reader@example.com" returnTo="/post/story"/>:<Wall/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'}})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{
 for(const scenario of ['http','network','json','success']){
  const page=await browser.newPage();let attempts=0;const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('http://local.test/**',r=>{
   if(r.request().url().includes('/api/auth/check-email')){
    attempts++
    if(attempts===1&&scenario==='network')return r.abort()
    if(attempts===1&&scenario==='json')return r.fulfill({status:502,body:'Bad gateway'})
    if(attempts===1&&scenario==='http')return r.fulfill({status:503,json:{error:'Delivery unavailable'}})
    return r.fulfill({json:{exists:true}})
   }
   return r.fulfill({contentType:'text/html',body:'<div id="root"></div>'})
  })
  await page.goto('http://local.test/post/story');await page.addScriptTag({path:out});await page.waitForTimeout(50)
  await page.evaluate(()=>{Object.defineProperty(window,'scrollY',{value:30,configurable:true});window.dispatchEvent(new Event('scroll'));Object.defineProperty(window,'scrollY',{value:60,configurable:true});window.dispatchEvent(new Event('scroll'))})
  await page.getByPlaceholder('Email address').fill('reader@example.com');await page.getByRole('button',{name:'Subscribe',exact:true}).click()
  if(scenario!=='success'){
   await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Subscribe',exact:true}).isEnabled(),true);assert.equal(await page.getByPlaceholder('Email address').inputValue(),'reader@example.com');assert.equal(new URL(page.url()).pathname,'/post/story')
   await page.getByRole('button',{name:'Subscribe',exact:true}).click()
  }
  await page.getByText('Check your inbox ✉️',{exact:true}).waitFor();assert.deepEqual(errors,[]);await page.close()
 }
 const page=await browser.newPage();let count=0
 await page.route('http://local.test/**',r=>{
  if(r.request().url().includes('/api/auth/resend-confirmation')){count++;return r.fulfill(count===1?{status:503,json:{error:'Email unavailable'}}:{json:{ok:true}})}
  return r.fulfill({contentType:'text/html',body:'<div id="root"></div>'})
 })
 await page.goto('http://local.test/resend');await page.addScriptTag({path:out});await page.getByText('Didn’t get the confirmation email? Resend',{exact:true}).click();await page.getByRole('button',{name:'Resend confirmation email',exact:true}).click();await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Resend confirmation email',exact:true}).click();await page.getByRole('status').waitFor();assert.equal(await page.getByRole('button',{name:/Try again in/}).isDisabled(),true);assert.equal(count,2)
 console.log('PASS article wall HTTP/network/JSON failures recover without redirect or stuck loading; accepted mail succeeds; confirmation resend failure retries and success has cooldown')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
