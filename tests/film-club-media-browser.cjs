// Actual Film Club admin and published portal components with local upload/data fixtures.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const {build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'film-media-ui-')),out=path.join(dir,'ui.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Admin from './app/admin/_components/FilmClubAdmin';import Published from './app/portal/film-club/PublishedFilmClub';createRoot(document.getElementById('root')).render(window.view==='admin'?<Admin/>:<Published/>);`},outfile:out,bundle:true,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/lib\/filmClubRequest$|lib\/uploadImage$|FilmTicketPurchase$|FilmClubModeration$|FilmClubDiscussions$|PortalShell$|^next\/link$/},a=>({path:a.path,namespace:'fixture'}))
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.endsWith('FilmTicketPurchase')?`export default function Purchase(){return null};export const FilmTicketOrders=()=>null;export const filmTicketRequest=(...args)=>window.filmRequest(...args);`:a.path.endsWith('filmClubRequest')?`export const filmClubRequest=(...args)=>window.filmRequest(...args);`:a.path.endsWith('uploadImage')?`export const uploadToCloudinary=async(file,folder)=>{window.uploads.push({name:file.name,type:file.type,folder});if(window.holdUpload)await new Promise(resolve=>window.finishUpload=resolve);return file.type.startsWith('image/')?'https://media.fixture/cover.webp':'https://media.fixture/clip.mp4'};`:a.path.endsWith('PortalShell')?`export const usePortal=()=>({member:{plan:"Reader's Circle",subscription_status:'active'}});`:a.path==='next/link'?`import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`:`export default function Empty(){return null}`,loader:'jsx',resolveDir:process.cwd()}))
 }}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',message=>{if(['error','warning'].includes(message.type())&&/same key|unique.*key|Warning:|Encountered two children/.test(message.text()))errors.push(message.text())})
  await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));await p.goto('https://fixture.test/')
  async function mount(view){
   await p.evaluate(view=>{
    window.view=view;window.uploads=[];window.calls=[];window.rejectCreateOnce=true
    window.records=[{event_id:'11111111-1111-4111-8111-111111111111',forum_id:'forum-existing',discussion_active:true,commenting_open:true,trailer_url:null,event:{id:'11111111-1111-4111-8111-111111111111',title:'Existing screening',status:'published',starts_at:'2099-12-12T19:00:00Z',cover_image_url:null}}]
    window.filmRequest=async(url,method='GET',body)=>{
     if(method==='GET'&&url.includes('overview=true'))return {dashboard:{byCurrency:[],rates:[],rows:[],tickets:0,screenings:0,pendingScreenings:0,unreportedTicketCounts:0}}
     if(method==='GET'&&url.includes('/tickets'))return {tickets:[],audit:[]}
     if(method==='GET')return {screenings:structuredClone(window.records)}
     window.calls.push({method,body})
     if(method==='PATCH'){
      const record=window.records.find(r=>r.event_id===body.eventId)
      if(body.action==='discussion')record[body.field]=body.value
      if(body.action==='cover')record.event.cover_image_url=body.cover_image_url
      if(body.action==='trailer')record.trailer_url=body.trailer_url
      return {ok:true}
     }
     if(window.rejectCreateOnce){window.rejectCreateOnce=false;throw new Error('Could not save screening. Please try again.')}
     window.records.push({event_id:body.id,trailer_url:body.trailer_url,event:{id:body.id,title:body.title,status:'draft',starts_at:body.starts_at,cover_image_url:body.cover_image_url}})
     return {eventId:body.id}
    }
   },view)
   await p.setContent(`<style>${fs.readFileSync(path.join(dir,'ui.css'),'utf8')}</style><div id="root"></div>`)
   await p.addScriptTag({path:out})
  }
  await mount('admin');await p.getByRole('button',{name:'Forums',exact:true}).click()
  const forumStrip=p.locator('summary').filter({hasText:'Existing screening — Discussion'});await forumStrip.waitFor();assert.equal(await forumStrip.evaluate(e=>e.parentElement.open),false);assert.equal(await p.getByRole('heading',{name:'Discussion settings'}).count(),0)
  await p.getByRole('searchbox',{name:'Search screening forums'}).fill('missing');await p.getByText('No forums match your search.',{exact:true}).waitFor();await p.getByRole('searchbox',{name:'Search screening forums'}).fill('Existing')
  await forumStrip.click();await p.getByRole('heading',{name:'Discussion settings'}).waitFor();assert.equal(await p.getByRole('switch',{name:'Commenting',exact:true}).isChecked(),true);await p.getByRole('switch',{name:'Commenting',exact:true}).uncheck();await p.waitForFunction(()=>window.records[0].commenting_open===false);assert.equal(await p.getByRole('switch',{name:'Commenting',exact:true}).isChecked(),false);assert.equal((await p.evaluate(()=>window.calls.at(-1))).body.eventId,'11111111-1111-4111-8111-111111111111')
  await p.getByRole('switch',{name:'Archive discussion',exact:true}).check();assert.equal((await p.evaluate(()=>window.calls.at(-1))).body.field,'discussion_archived');assert.equal((await p.evaluate(()=>window.calls.at(-1))).body.value,true)
  await p.getByRole('switch',{name:'Visibility in active lists',exact:true}).uncheck();assert.equal((await p.evaluate(()=>window.calls.at(-1))).body.field,'discussion_active');assert.equal((await p.evaluate(()=>window.calls.at(-1))).body.value,false)
  await p.getByLabel('Parlor account email',{exact:true}).fill('filmmaker@example.invalid');await p.getByLabel('Access expires (your local time)',{exact:true}).fill('2099-12-13T19:00');await p.getByRole('button',{name:'Invite co-moderator',exact:true}).click();assert.equal((await p.evaluate(()=>window.calls.at(-1))).body.action,'invite');assert.equal((await p.evaluate(()=>window.calls.at(-1))).body.eventId,'11111111-1111-4111-8111-111111111111')
  await forumStrip.click();assert.equal(await p.getByRole('heading',{name:'Discussion settings'}).count(),0)
  await p.getByRole('button',{name:'Screenings',exact:true}).click()
  await p.getByRole('heading',{name:'Existing screening'}).waitFor()
  assert.equal(await p.getByText('Could not load ticket revenue.',{exact:true}).count(),0)
  assert.deepEqual(errors,[])
  assert.equal(await p.getByLabel('Upload cover image',{exact:true}).count(),0)
  await p.getByRole('button',{name:'Edit',exact:true}).click()
  await p.getByRole('dialog',{name:'Edit screening',exact:true}).waitFor()
  assert.equal(await p.evaluate(()=>document.body.style.overflow),'hidden')
  assert.ok(await p.getByRole('dialog').evaluate(d=>d.contains(document.activeElement)))
  await p.getByRole('button',{name:'Choose starts',exact:true}).click();await p.getByRole('dialog',{name:'Choose starts',exact:true}).waitFor();await p.keyboard.press('Escape');assert.equal(await p.getByRole('dialog',{name:'Edit screening',exact:true}).count(),1)
  await p.keyboard.press('Escape')
  assert.equal(await p.getByRole('dialog').count(),0)
  assert.equal(await p.evaluate(()=>document.body.style.overflow),'')
  assert.equal(await p.getByRole('button',{name:'Edit',exact:true}).evaluate(b=>b===document.activeElement),true)
  await p.getByRole('button',{name:'Edit',exact:true}).click()
  const bounds=await p.getByRole('dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width)
  const chooseCover=p.waitForEvent('filechooser');await p.getByRole('button',{name:'Choose cover image file',exact:true}).focus();await p.keyboard.press('Enter');await (await chooseCover).setFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from('fixture')})
  await p.getByLabel('Cover image URL',{exact:true}).evaluate(e=>e.value).then(value=>assert.equal(value,'https://media.fixture/cover.webp'))
  await p.getByLabel('Upload video snippet',{exact:true}).setInputFiles({name:'trailer.mp4',mimeType:'video/mp4',buffer:Buffer.from('fixture')})
  await p.locator('video').waitFor();assert.equal(await p.locator('video').getAttribute('src'),'https://media.fixture/clip.mp4')
  // Dropping and browsing use the same validation and upload lock.
  const coverDrop=p.getByRole('group',{name:'Cover image drop area',exact:true}),videoDrop=p.getByRole('group',{name:'Video snippet drop area',exact:true})
  const badDrop=await p.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['bad'],'wrong.mp4',{type:'video/mp4'}));return d})
  const count=await p.evaluate(()=>window.uploads.length);await coverDrop.dispatchEvent('drop',{dataTransfer:badDrop});await p.getByRole('alert').getByText('Choose a JPG, PNG, WebP or GIF cover image.',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.uploads.length),count)
  const multiple=await p.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['a'],'one.png',{type:'image/png'}));d.items.add(new File(['b'],'two.png',{type:'image/png'}));return d});await coverDrop.dispatchEvent('drop',{dataTransfer:multiple});await p.getByRole('alert').getByText('Choose one file at a time.',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.uploads.length),count)
  await p.evaluate(()=>{window.holdUpload=true})
  const imageDrop=await p.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['image'],'dropped-cover.png',{type:'image/png'}));return d})
  await coverDrop.dispatchEvent('dragenter',{dataTransfer:imageDrop});assert.equal(await coverDrop.getAttribute('data-dragging'),'true');await coverDrop.dispatchEvent('drop',{dataTransfer:imageDrop})
  await p.getByRole('status').getByText('Uploading cover image…',{exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Choose video snippet file',exact:true}).isDisabled(),true)
  const video=await p.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['video'],'dropped-trailer.mp4',{type:'video/mp4'}));return d})
  await videoDrop.dispatchEvent('drop',{dataTransfer:video});assert.equal(await p.evaluate(()=>window.uploads.length),count+1)
  await p.evaluate(()=>{window.holdUpload=false;window.finishUpload()});await coverDrop.getByText('dropped-cover.png',{exact:true}).waitFor()
  await videoDrop.dispatchEvent('drop',{dataTransfer:video});await videoDrop.getByText('dropped-trailer.mp4',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.uploads.length),count+2)
  const oversized=await p.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File([new Uint8Array(4*1024*1024+1)],'too-large.mp4',{type:'video/mp4'}));return d})
  await videoDrop.dispatchEvent('drop',{dataTransfer:oversized});await p.getByRole('alert').getByText('Choose a file up to 4 MB. For larger trailers, use a YouTube or Vimeo link.',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.uploads.length),count+2)
  // A valid browser selection still works after a rejected drop.
  await p.getByLabel('Upload video snippet',{exact:true}).setInputFiles({name:'trailer.mp4',mimeType:'video/mp4',buffer:Buffer.from('fixture')})
  await p.getByRole('button',{name:'Save cover image',exact:true}).click()
  await p.getByText('Screening media saved.',{exact:true}).waitFor()
  assert.equal(await p.getByLabel('Trailer URL',{exact:true}).inputValue(),'https://media.fixture/clip.mp4')
  await p.getByRole('button',{name:'Save trailer',exact:true}).click()
  await p.getByRole('button',{name:'Done',exact:true}).click()
  await p.getByRole('button',{name:'+ Add screening event',exact:true}).click()
  const form=p.getByRole('dialog',{name:'Add screening event',exact:true}).locator('form')
  await form.getByLabel('Title',{exact:true}).fill('New screening')
  await form.getByLabel('Screening date and time (your local time)',{exact:true}).fill('2099-12-14T19:00')
  await form.getByLabel('Cover image URL',{exact:true}).fill('https://media.fixture/new-cover.webp')
  await form.getByLabel('Trailer URL',{exact:true}).fill('https://youtu.be/fixture123')
  await form.getByRole('button',{name:'Preview trailer',exact:true}).click()
  assert.equal(await form.locator('iframe').getAttribute('src'),'https://www.youtube.com/embed/fixture123')
  await form.getByRole('button',{name:'Add screening event',exact:true}).click()
  await p.getByRole('dialog').getByRole('alert').getByText('Could not save screening. Please try again.').waitFor()
  assert.equal(await form.getByLabel('Title',{exact:true}).inputValue(),'New screening')
  await form.getByRole('button',{name:'Add screening event',exact:true}).click()
  await p.getByText('Screening saved as a draft in Events.',{exact:true}).waitFor()
  const calls=await p.evaluate(()=>window.calls)
  const submissions=calls.filter(c=>c.method==='POST');assert.equal(submissions.length,2);assert.equal(submissions[0].body.id,submissions[1].body.id)
  assert.equal(calls.find(c=>c.method==='POST').body.cover_image_url,'https://media.fixture/new-cover.webp')
  assert.equal(calls.find(c=>c.method==='POST').body.trailer_url,'https://youtu.be/fixture123')
  // Portal receives the saved cover and uploaded trailer in the published screening response.
  await mount('published')
  await p.evaluate(()=>{window.records[0].event.cover_image_url='https://media.fixture/cover.webp';window.records[0].trailer_url='https://media.fixture/clip.mp4'})
  // Remount to re-fetch the edited fixture.
  await p.setContent(`<style>${fs.readFileSync(path.join(dir,'ui.css'),'utf8')}</style><div id="root"></div>`);await p.addScriptTag({path:out})
  await p.locator('video').waitFor();assert.equal(await p.locator('video').getAttribute('poster'),'https://media.fixture/cover.webp')
  assert.equal(await p.locator('img[src="https://media.fixture/cover.webp"]').count(),1)
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await p.close()
 }console.log('PASS Film Club media UI: cover/video uploads, previews, independent saves, new-screening fields and published portal at mobile/desktop.')}finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1})
