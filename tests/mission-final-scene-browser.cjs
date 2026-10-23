const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'mission-final-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{gsap}from'gsap';import Mission from './app/about/mission/MissionRoom';gsap.globalTimeline.timeScale(100);createRoot(document.getElementById('root')).render(<Mission/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'}})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('http://local.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}))
 await page.goto('http://local.test/mission');await page.addScriptTag({path:out});await page.waitForTimeout(1000)
 for(const key of ['ArrowDown','ArrowDown','ArrowRight','ArrowDown','ArrowDown']){await page.keyboard.press(key);await page.waitForTimeout(1000)}
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.parlor-join-overlay')).opacity==='1')
 const y=await page.evaluate(()=>scrollY)
 await page.mouse.wheel(0,-1500);await page.waitForTimeout(800)
 for(const key of ['ArrowUp','PageUp','Home','ArrowLeft','ArrowDown','End',' ']){await page.keyboard.press(key)}
 await page.waitForTimeout(800);assert.equal(await page.locator('.parlor-join-overlay').evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await page.evaluate(()=>scrollY),y)
 const email=page.locator('.parlor-join-overlay input[type=email]');await email.fill('reader@example.com');await email.press('ArrowLeft');assert.equal(await email.inputValue(),'reader@example.com')
 await page.reload();await page.addScriptTag({path:out});await page.waitForTimeout(1000);assert.equal(await page.locator('.parlor-join-overlay').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.deepEqual(errors,[])
 console.log('PASS final scene remains on wheel/keyboard rewind; email remains editable; fresh page visit restarts story')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
