// Short-lived presence only. Identity/location are resolved by the server.
(()=>{
  if(window.__parlorLivePresence)return
  window.__parlorLivePresence=true
  const instanceId=crypto.randomUUID()
  let token=null,busy=false,queued=false,generation=0
  const optedOut=()=>navigator.doNotTrack==='1' || window.doNotTrack==='1' || navigator.globalPrivacyControl
  const allowed=()=>!/^\/(?:admin|dashboard|api)(?:\/|$)/i.test(location.pathname)
  const post=body=>fetch('/api/live-session',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  function end(){
    generation++;const previous=token;token=null
    if(previous)post({token:previous,ended:true}).catch(()=>{})
  }
  async function ping(){
    if(optedOut() || !allowed()){end();return}
    if(document.visibilityState==='hidden')return
    if(busy){queued=true;return}
    busy=true;const version=generation
    try{
      const r=await post({instance_id:instanceId,token,path:location.pathname,device:innerWidth<768?'mobile':innerWidth<1024?'tablet':'desktop'}),data=await r.json()
      if(r.ok && data.token && version===generation)token=data.token
    }catch{}
    finally{busy=false;if(queued){queued=false;queueMicrotask(ping)}}
  }
  window.addEventListener('parlor-live-route',ping)
  window.addEventListener('parlor-live-auth',()=>setTimeout(ping,0))
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ping()})
  window.addEventListener('pageshow',ping)
  window.addEventListener('pagehide',end)
  setInterval(ping,20000)
  ping()
})()
