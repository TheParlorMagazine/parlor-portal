// Instrument only the standalone promotional page; Next.js pages use the component.
(async()=>{
  if(navigator.doNotTrack==='1' || window.doNotTrack==='1' || navigator.globalPrivacyControl)return
  await new Promise(resolve=>{if(window.ParlorConsent?.analytics()===true)return resolve();const check=()=>{if(window.ParlorConsent?.analytics()===true){window.removeEventListener('parlor-consent-change',check);window.removeEventListener('parlor-consent-ready',check);resolve()}};window.addEventListener('parlor-consent-change',check);window.addEventListener('parlor-consent-ready',check)})
  try{const response=await fetch('/api/member-activity',{cache:'no-store'});const state=await response.json();if(!state.authenticated)return}catch{return}
  const path=location.pathname
  let lastClick=0
  function send(type,target){if(window.ParlorConsent?.analytics()!==true)return;try{fetch('/api/member-activity',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({event_id:crypto.randomUUID(),type,path,target})}).catch(()=>{})}catch{}}
  send('page_view',null)
  document.addEventListener('click',event=>{
    if(!event.isTrusted || Date.now()-lastClick<500)return
    const el=event.target instanceof Element?event.target.closest('a[href],button'):null
    if(!el || el.closest('[contenteditable="true"]'))return
    let target=null
    if(el.tagName==='A')target=el.href
    else{
      const text=(el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase()
      if(/check\s?out|continue to payment/.test(text))target='action:checkout'
      else if(/add to (?:cart|bag)/.test(text))target='action:add-to-cart'
      else if(/subscribe/.test(text))target='action:subscribe'
      else if(/purchase|buy now/.test(text))target='action:purchase'
    }
    if(target){lastClick=Date.now();send('click',target)}
  },true)
})()
