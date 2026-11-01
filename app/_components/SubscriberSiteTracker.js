'use client'
import { useEffect,useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { activityPath,activityTarget } from '../../lib/memberActivity'
export default function SubscriberSiteTracker(){
  const pathname=usePathname(),last=useRef(null),lastClick=useRef(0)
  useEffect(()=>{
    if(navigator.doNotTrack==='1' || window.doNotTrack==='1' || navigator.globalPrivacyControl)return
    const path=activityPath(pathname,window.location.origin)
    if(!path)return
    const sb=createClient();let live=true,session=null
    function send(type,target=null){
      if(!session?.access_token || !live)return
      try{fetch('/api/member-activity',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({event_id:crypto.randomUUID(),type,path,target})}).catch(()=>{})}catch{}
    }
    function identify(next){
      session=next
      const key=next?.user?.id+':'+pathname
      if(next && key!==last.current){last.current=key;send('page_view')}
      if(!next)last.current=null
    }
    sb.auth.getSession().then(({data})=>{if(live)identify(data?.session)}).catch(()=>{})
    const {data:sub}=sb.auth.onAuthStateChange((_event,next)=>{if(live)identify(next)})
    function click(e){
      if(!e.isTrusted || Date.now()-lastClick.current<500)return
      const el=e.target instanceof Element?e.target.closest('a[href],button'):null
      if(!el || el.closest('[contenteditable="true"]'))return
      let target=null
      if(el.tagName==='A')target=activityTarget(el.href,window.location.origin)
      else{
        const text=(el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase()
        const action=/check\s?out/.test(text)?'checkout':/add to (?:cart|bag)/.test(text)?'add-to-cart':/subscribe/.test(text)?'subscribe':/^save(?: changes)?$/.test(text)?'save':/^join\b/.test(text)?'join':/purchase|buy now/.test(text)?'purchase':/wishlist/.test(text)?'wishlist':null
        if(action)target='action:'+action
      }
      if(target){lastClick.current=Date.now();send('click',target)}
    }
    document.addEventListener('click',click,true)
    return()=>{live=false;document.removeEventListener('click',click,true);sub?.subscription?.unsubscribe?.()}
  },[pathname])
  return null
}
