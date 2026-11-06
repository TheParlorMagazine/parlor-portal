// Shared by Next.js and standalone pages. No optional telemetry before opt-in.
(()=>{
  if(window.ParlorConsent)return
  const KEY='parlor_cookie_consent',MAX_AGE=180*86400000
  const privacy=()=>navigator.doNotTrack==='1'||window.doNotTrack==='1'||!!navigator.globalPrivacyControl
  function read(){try{const v=JSON.parse(localStorage.getItem(KEY));return v?.version===1&&typeof v.analytics==='boolean'&&Number.isFinite(v.savedAt)&&v.savedAt<=Date.now()&&Date.now()-v.savedAt<MAX_AGE?v:null}catch{return null}}
  const allowed=()=>!privacy()&&read()?.analytics===true
  let pagePath=location.pathname
  const adminPage=()=>/^\/(?:admin|dashboard)(?:\/|$)/i.test(pagePath)
  window.ParlorConsent={analytics:allowed,open:()=>show(true),setPage:path=>{pagePath=path;syncPage()}}
  const style=document.createElement('style');style.textContent=`
.parlor-cookie{box-sizing:border-box;position:fixed;bottom:0;left:0;right:0;z-index:10040;background:#fff;color:#0a0a0a;border-top:1px solid #e5e0e2;box-shadow:0 -5px 22px #0a0a0a08;padding:22px 32px;font-family:'Source Serif 4',Georgia,serif;max-height:85dvh;overflow:auto}.parlor-cookie-inner{display:flex;align-items:center;gap:32px;max-width:1400px;margin:auto}.parlor-cookie-copy{flex:1}.parlor-cookie h2{font-family:'Playfair Display',Georgia,serif;font-size:22px;margin:0 0 8px}.parlor-cookie p{font-size:15px;line-height:1.6;margin:0;color:#555}.parlor-cookie a{color:#7a263a;text-underline-offset:3px}.parlor-cookie-actions{display:flex;gap:10px;flex-wrap:wrap}.parlor-cookie button,.parlor-cookie-reopen{font:inherit;font-size:14px;min-height:44px;border:1px solid #0a0a0a;border-radius:24px;padding:10px 18px;background:#fff;color:#0a0a0a;cursor:pointer}.parlor-cookie button.choice{min-width:135px;font-weight:600}.parlor-cookie button.prefs{color:#7a263a;border-color:#e5e0e2}.parlor-cookie button:focus-visible,.parlor-cookie a:focus-visible,.parlor-cookie-reopen:focus-visible{outline:3px solid #7a263a;outline-offset:3px}.parlor-cookie-reopen{position:fixed;bottom:var(--parlor-cookie-bottom,12px);left:12px;z-index:10000;font-family:'Source Serif 4',Georgia,serif;font-size:12px;color:#7a263a;border-color:#e5e0e2;box-shadow:0 2px 10px #0001}.parlor-cookie-settings{max-width:550px;margin:18px 0 0}.parlor-cookie-row{display:flex;justify-content:space-between;gap:20px;border-top:1px solid #eee;padding:14px 0;line-height:1.5}.parlor-cookie-row small{display:block;color:#666}.parlor-cookie-row input{width:22px;height:22px;accent-color:#7a263a}.parlor-cookie [hidden]{display:none!important}@media(max-width:700px){.parlor-cookie{padding:20px;padding-bottom:max(20px,env(safe-area-inset-bottom))}.parlor-cookie-inner{display:block}.parlor-cookie-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:18px}.parlor-cookie button.choice{min-width:0;padding:10px 12px}.parlor-cookie button.prefs{grid-column:1/-1}}
`;document.head.append(style)
  const box=document.createElement('section');box.className='parlor-cookie';box.setAttribute('aria-label','Cookie choices');box.hidden=true
  box.innerHTML=`<div class="parlor-cookie-inner"><div class="parlor-cookie-copy"><h2>A little privacy, please.</h2><p>We use essential cookies to keep the site working. With your permission, we also use analytics to understand how readers use The Parlor. You can change your choice at any time. <a href="/privacy">Privacy policy</a></p><div class="parlor-cookie-settings" hidden><div class="parlor-cookie-row"><div>Essential<small>Sign-in, shopping and your privacy choice.</small></div><span>Always on</span></div><label class="parlor-cookie-row"><span>Analytics<small>Optional measurement of readership and site activity.</small></span><input type="checkbox" aria-label="Allow analytics"></label><p class="parlor-cookie-signal" hidden>Your browser’s privacy signal keeps optional analytics off.</p><button type="button" data-action="save">Save preferences</button></div></div><div class="parlor-cookie-actions"><button type="button" class="choice" data-action="reject">Reject optional</button><button type="button" class="choice" data-action="accept">Accept analytics</button><button type="button" class="prefs" data-action="preferences">Preferences</button></div></div>`
  const reopen=document.createElement('button');reopen.type='button';reopen.className='parlor-cookie-reopen';reopen.textContent='Cookie preferences';reopen.hidden=true;reopen.onclick=()=>show(true)
  document.body.append(box,reopen)
  function show(settings=false){if(adminPage())return;box.hidden=false;reopen.hidden=true;box.querySelector('.parlor-cookie-settings').hidden=!settings;const input=box.querySelector('input');input.checked=allowed();input.disabled=privacy();box.querySelector('.parlor-cookie-signal').hidden=!privacy();if(settings)box.querySelector('[data-action="save"]').focus()}
  function save(analytics){const previous=allowed();try{localStorage.setItem(KEY,JSON.stringify({version:1,analytics:analytics&&!privacy(),savedAt:Date.now()}))}catch{box.querySelector('p').textContent='Your browser could not save this choice. Optional analytics remain off. You can keep browsing.';return}box.hidden=true;reopen.hidden=adminPage();window.dispatchEvent(new Event('parlor-consent-change'));if(previous&&!allowed()){
    for(const key of['parlor_visitor_id','parlor_session_id'])try{localStorage.removeItem(key)}catch{}
    try{sessionStorage.removeItem('parlor_country')}catch{}
    for(const part of document.cookie.split(';')){const name=part.split('=')[0].trim();if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name))continue;const host=location.hostname.split('.');for(let i=0;i<host.length-1;i++)document.cookie=name+'=; Max-Age=0; Path=/; Domain=.'+host.slice(i).join('.');document.cookie=name+'=; Max-Age=0; Path=/'}
    location.reload()
  }}
  box.addEventListener('click',event=>{const action=event.target.closest('button')?.dataset.action;if(action==='preferences')show(true);if(action==='reject')save(false);if(action==='accept')save(true);if(action==='save')save(box.querySelector('input').checked)})
  window.addEventListener('storage',e=>{if(e.key===KEY){window.dispatchEvent(new Event('parlor-consent-change'));location.reload()}})
  document.addEventListener('click',e=>{if(e.target.closest('[data-cookie-preferences]'))show(true)})
  function syncPage(){if(adminPage()){box.hidden=true;reopen.hidden=true}else if(!read())show();else{box.hidden=true;reopen.hidden=false}}
  // Follow the actual banner height as content wraps and mobile cards expand.
  const banners=new Set(),resize=new ResizeObserver(positionButton)
  function positionButton(){let bottom=12;for(const banner of banners){const rect=banner.getBoundingClientRect();if(rect.width&&rect.height&&getComputedStyle(banner).visibility!=='hidden'&&rect.top<innerHeight&&rect.bottom>0)bottom=Math.max(bottom,innerHeight-rect.top+12)}const value=Math.ceil(bottom)+'px';if(reopen.style.getPropertyValue('--parlor-cookie-bottom')!==value)reopen.style.setProperty('--parlor-cookie-bottom',value)}
  function scanBanners(){const current=new Set(document.querySelectorAll('.ribbon,.sub-ribbon'));for(const banner of banners)if(!current.has(banner)){resize.unobserve(banner);banners.delete(banner)}for(const banner of current)if(!banners.has(banner)){banners.add(banner);resize.observe(banner)}positionButton()}
  new MutationObserver(scanBanners).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']})
  window.addEventListener('resize',positionButton)
  document.addEventListener('transitionend',positionButton)
  scanBanners()
  syncPage()
  window.dispatchEvent(new Event('parlor-consent-ready'))
})()
