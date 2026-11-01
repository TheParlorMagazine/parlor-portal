'use client'
import { useEffect,useRef,useState } from 'react'
const ff="'Source Serif 4', Georgia, serif"
const stamp=value=>new Date(value).toLocaleTimeString()
const locationLabel=s=>[s.city,s.region,s.country].filter(Boolean).join(', ') || 'Location unavailable'
const identity=s=>s.is_member?(s.full_name || s.email || 'Signed-in member'):'Unidentified user'
const pageLabel=path=>path==='/'?'Home':path || 'Unknown page'
export default function LiveVisitors({supabase,onCount}){
  const [sessions,setSessions]=useState([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[open,setOpen]=useState(false),[selected,setSelected]=useState(null),[asOf,setAsOf]=useState(null)
  const trigger=useRef(null),closeButton=useRef(null),drawer=useRef(null)
  useEffect(()=>{const show=()=>{setOpen(true);setSelected(null)};window.addEventListener('parlor-live-sessions-open',show);return()=>window.removeEventListener('parlor-live-sessions-open',show)},[])
  useEffect(()=>{
    let live=true,busy=false
    async function refresh(){
      if(busy)return;busy=true
      try{
        const {data:{session}}=await supabase.auth.getSession()
        if(!session)throw Error('Sign in again to view live sessions.')
        const r=await fetch('/api/admin/live-sessions',{cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}}),data=await r.json()
        if(!r.ok){if(live && [401,403].includes(r.status))setSessions([]);throw Error(data.error || 'Sessions unavailable.')}
        if(live){setSessions(data.sessions || []);setAsOf(data.asOf);setError('');setLoaded(true);onCount?.(data.count)}
      }catch(e){if(live){setError(e.message);onCount?.(null)}}finally{busy=false}
    }
    refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},open?5000:15000)
    return()=>{live=false;clearInterval(timer)}
  },[supabase,open,onCount])
  useEffect(()=>{
    if(!open)return
    const previous=document.activeElement,overflow=document.body.style.overflow
    document.body.style.overflow='hidden';closeButton.current?.focus()
    const key=e=>{
      if(e.key==='Escape')setOpen(false)
      if(e.key==='Tab'){
        const focusable=drawer.current?.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')
        const first=focusable?.[0],last=focusable?.[focusable.length-1]
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus()}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus()}
      }
    }
    document.addEventListener('keydown',key)
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus?.()}
  },[open])
  const current=sessions.find(s=>s.visitor_id===selected)
  return <>
    <button ref={trigger} type="button" onClick={()=>{setOpen(true);setSelected(null)}} style={{width:'100%',textAlign:'left',fontFamily:ff,background:'#fff',border:'1px solid #e8e8e8',borderRadius:10,padding:'18px 20px',marginBottom:14,cursor:'pointer'}}>
      <strong style={{fontSize:20,color:'#222'}}>{loaded && !error?sessions.length:'—'}</strong> <span style={{color:'#777'}}>Visitors Online Now</span><span style={{float:'right',color:'#7A263A'}}>View sessions →</span>
    </button>
    {error && <p role="status" style={{color:'#9b3c42',fontSize:12}}>{error}</p>}
    {open && <div style={{position:'fixed',inset:0,zIndex:2200,display:'flex',justifyContent:'flex-end',background:'rgba(0,0,0,.35)'}} onClick={()=>setOpen(false)}>
      <aside ref={drawer} role="dialog" aria-modal="true" aria-label="Active website sessions" onClick={e=>e.stopPropagation()} style={{width:'min(560px,100vw)',height:'100%',overflowY:'auto',background:'#fff',boxShadow:'-8px 0 30px rgba(0,0,0,.12)',fontFamily:ff,padding:24,boxSizing:'border-box'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><h2 style={{margin:0,fontSize:24}}>Active sessions</h2><button ref={closeButton} type="button" aria-label="Close active sessions" onClick={()=>setOpen(false)} style={{font:'inherit',border:0,background:'none',fontSize:26,cursor:'pointer'}}>×</button></div>
        <p style={{fontSize:12,color:'#888',lineHeight:1.5}}>Seen within the last 90 seconds. Updates every 5 seconds while open. IP-based location is approximate and may reflect a VPN.</p>
        {asOf && <p style={{fontSize:12,color:'#888'}}>Last refreshed {stamp(asOf)}</p>}
        {error && <p role="alert">{error} Displayed sessions may be out of date.</p>}
        {!loaded && !error && <p>Loading sessions…</p>}
        {loaded && !sessions.length && !error && <p>No active visitors right now.</p>}
        <div aria-label="All active sessions" style={{maxHeight:selected?'35vh':'none',overflowY:'auto'}}>
          {sessions.map(s=><button key={s.visitor_id} type="button" aria-pressed={selected===s.visitor_id} onClick={()=>setSelected(s.visitor_id)} style={{width:'100%',textAlign:'left',font:'inherit',background:selected===s.visitor_id?'#fff1f5':'#fff',border:'1px solid #eee',borderRadius:8,padding:12,marginBottom:8,cursor:'pointer',overflowWrap:'anywhere'}}>
            <strong>{identity(s)}</strong> <span style={{fontSize:11,color:'#888'}}>{s.is_member?'Member':'Guest'} · {s.visitor_id.slice(-6)}</span>
            {s.is_member && s.email && <div style={{fontSize:12,color:'#777'}}>{s.email}</div>}
            <div style={{fontSize:13,marginTop:5}}>{pageLabel(s.current_page)}</div>
            <div style={{fontSize:12,color:'#888',marginTop:4}}>{locationLabel(s)} · {s.device_type} · {stamp(s.last_seen)}</div>
          </button>)}
        </div>
        {selected && !current && <p role="status">This session is no longer active.</p>}
        {current && <section aria-label="Selected session details" style={{borderTop:'1px solid #eee',paddingTop:18,marginTop:16}}>
          <button type="button" onClick={()=>setSelected(null)} style={{font:'inherit',color:'#7A263A',border:0,background:'none',padding:0,cursor:'pointer'}}>← All sessions</button>
          <h3>{identity(current)}</h3>
          {current.email && <p>{current.email}</p>}
          <dl style={{fontSize:13,lineHeight:1.7,overflowWrap:'anywhere'}}><dt>Current page</dt><dd>{pageLabel(current.current_page)}</dd><dt>Approximate location</dt><dd>{locationLabel(current)}</dd><dt>Device</dt><dd>{current.device_type}</dd><dt>Session started</dt><dd>{new Date(current.first_seen).toLocaleString()}</dd><dt>Last seen</dt><dd>{new Date(current.last_seen).toLocaleString()}</dd></dl>
          <h4 style={{fontSize:14}}>Recent pages in this session</h4>
          {(current.recent_pages || []).slice().reverse().map((p,i)=><div key={i} style={{padding:'7px 0',fontSize:12,borderTop:'1px solid #f2f2f2',overflowWrap:'anywhere'}}>{pageLabel(p.path)} <span style={{color:'#888'}}>· {stamp(p.at)}</span></div>)}
        </section>}
      </aside>
    </div>}
  </>
}
