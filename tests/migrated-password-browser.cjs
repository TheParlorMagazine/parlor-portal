const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'migrated-auth-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React,{StrictMode}from'react';import{createRoot}from'react-dom/client';import Signup from './app/signup/page';import Login from './app/login/page';import Reset from './app/auth/reset-password/page';createRoot(document.getElementById('root')).render(<StrictMode>{location.pathname==='/signup'?<Signup/>:location.pathname==='/reset'?<Reset/>:<Login/>}</StrictMode>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'mock',setup(b){b.onResolve({filter:/lib\/supabase$|^next\/navigation$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='next/navigation'?`export const useRouter=()=>({push:url=>window.destination=url});export const useSearchParams=()=>new URLSearchParams(location.search);`:`const auth={signInWithPassword:async()=>({error:{code:'invalid_credentials',message:'Invalid login credentials'}}),signUp:async()=>{window.signupCalls=(window.signupCalls||0)+1;return{data:{user:{identities:[{provider:'email'}]}}}},verifyOtp:async()=>{window.verifyCalls=(window.verifyCalls||0)+1;await new Promise(r=>setTimeout(r,60));return{data:{session:{access_token:'test'}}}},getSession:async()=>({data:{session:{access_token:'test'}}}),updateUser:async({password})=>{window.updatedPassword=password;return{error:null}}};export const createClient=()=>({auth});`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const scenario of ['existing','new','mail-failure','login','reset']){
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('http://local.test/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/auth/check-email')return r.fulfill(scenario==='mail-failure'?{status:503,json:{error:'Could not send password email'}}:{json:{exists:scenario==='existing',passwordSetup:scenario==='existing'}});if(u.pathname==='/api/auth/send-reset')return r.fulfill({json:{ok:true}});return r.fulfill({contentType:'text/html',body:'<div id="root"></div>'})})
 await page.goto('http://local.test/'+(['login','reset'].includes(scenario)?scenario:'signup')+(scenario==='reset'?'?token_hash=token&type=recovery':''));await page.addScriptTag({path:out})
 if(['existing','new','mail-failure'].includes(scenario)){
 await page.getByPlaceholder('Your name').fill('Existing Member');await page.locator('input[type=email]').fill('existing@example.com');await page.locator('input[type=password]').fill('password123');await page.getByRole('button',{name:'Create account',exact:true}).click()
 if(scenario==='existing'){await page.getByText(/An account is already associated/).waitFor();assert.equal(await page.evaluate(()=>window.signupCalls||0),0)}
 else if(scenario==='new'){await page.getByText(/We requested a confirmation email/).waitFor();assert.equal(await page.evaluate(()=>window.signupCalls),1)}
 else{await page.getByText('Could not send password email',{exact:true}).waitFor();assert.equal(await page.getByText('Check your email',{exact:true}).count(),0)}
 }else if(scenario==='login'){
 await page.locator('input[type=email]').fill('existing@example.com');await page.locator('input[type=password]').fill('old-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText(/If you joined on our previous site/).waitFor();await page.getByRole('button',{name:'Set or reset password',exact:true}).click();await page.getByText(/If an account exists for/).waitFor()
 }else{
 await page.waitForFunction(()=>!document.querySelector('button[type=submit]').disabled);await page.locator('input[type=password]').nth(0).fill('new-password123');await page.locator('input[type=password]').nth(1).fill('new-password123');await page.getByRole('button',{name:'Update password',exact:true}).click();await page.waitForFunction(()=>window.destination==='/portal');assert.equal(await page.evaluate(()=>window.verifyCalls),1);assert.equal(await page.evaluate(()=>window.updatedPassword),'new-password123')
 }
 assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS migrated signup uses password setup; new signup unchanged; delivery failure visible; login migration guidance; reset link verified once and password saved')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
