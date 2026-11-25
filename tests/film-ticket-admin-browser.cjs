const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'film-ticket-admin-')),out=path.join(dir,'ui.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{FilmTicketSettings,FilmTicketManagement}from'./app/admin/_components/FilmTicketAdmin';function App(){const[s,setS]=useState(window.screening);return <><FilmTicketSettings screening={s} onChanged={async()=>setS({...window.screening})}/><FilmTicketManagement screening={s}/></>}createRoot(document.getElementById('root')).render(<App/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/lib\/filmClubRequest$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const filmClubRequest=(...args)=>window.filmRequest(...args);`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000)
 await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));await page.goto('https://fixture.test/')
 await page.evaluate(()=>{
 window.calls=[]
 window.screening={event_id:'screening',event:{title:'Documentary',starts_at:'2099-01-01',status:'draft'},ticket_url:'https://kinema.com/example',currency:'usd',ticket_price_cents:999,member_discount_percent:20,member_price_override_cents:null,member_ticket_limit:10,acquisition_cost_cents:999,host_share_percent:45,host_share_eligibility:'unknown',license_price_cents:10000,license_threshold:23,ticket_settings:{format:'live',fulfillment_method:'individual'},provider_authorized:false}
 window.filmRequest=async(url,method,body)=>{if(method==='POST'){window.calls.push(body);if(body.action==='settings')window.screening=body.settings;return{ok:true}}return{tickets:[{id:'ticket',event_id:'screening',member:{full_name:'Reader',email:'reader@example.invalid'},eligibility:{plan:'Reader Circle',status:'active'},purchased_at:'2026-11-25',amount_cents:799,currency:'usd',order:{order_number:'PARLOR-1000',stripe_payment_intent:'pi_ticket'},screening:{event:{title:'Documentary'}},payment_status:'paid',fulfillment_status:'awaiting_access',access_email_status:'not_sent',purchase_email_status:'accepted'}],audit:[]}}
 })
 await page.setContent(`<style>${fs.readFileSync(path.join(dir,'ui.css'),'utf8')}</style><div id="root"></div>`);await page.addScriptTag({path:out})
 await page.getByText(/Public \$9.99 · Member \$7.99/).waitFor();await page.getByLabel('Member discount (%)',{exact:true}).fill('30');await page.getByText(/Member \$6.99/).waitFor();await page.getByRole('button',{name:'Save configuration'}).click();assert.equal((await page.evaluate(()=>window.calls[0])).settings.member_discount_percent,30)
 await page.getByRole('button',{name:'Create Stripe ticket product'}).click();assert.equal((await page.evaluate(()=>window.calls[1])).action,'sync')
 await page.getByRole('button',{name:'Manage',exact:true}).click();await page.getByLabel('viewing url').fill('https://provider.invalid/access');await page.getByLabel('instructions',{exact:true}).fill('Use the provider link');await page.getByRole('button',{name:'Save fulfillment / new access version'}).click();assert.equal((await page.evaluate(()=>window.calls.at(-1))).action,'fulfillment')
 await page.getByRole('button',{name:'Send viewing instructions'}).click();assert.equal((await page.evaluate(()=>window.calls.at(-1))).action,'send')
 assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS admin ticket pricing preview, settings, Stripe action, ticket management and access delivery controls on mobile/desktop')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
