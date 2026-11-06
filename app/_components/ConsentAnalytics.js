'use client'
import Script from 'next/script'
import { useEffect,useRef,useState } from 'react'
import { usePathname } from 'next/navigation'
import PageViewTracker from './PageViewTracker'
import LiveSessionTracker from './LiveSessionTracker'
import SubscriberSiteTracker from './SubscriberSiteTracker'
import { initializeGoogleConsent } from '../../lib/googleConsent'

export default function ConsentAnalytics(){
  const [allowed,setAllowed]=useState(false),pathname=usePathname(),loaded=useRef(false),last=useRef(null),consent=useRef(null)
  const id=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''
  const adsId='AW-17582286057'
  const publicPage=!/^\/(?:admin|dashboard|auth|login|signup|logout|reset-password|forgot-password|checkout|portal)(?:\/|$)/i.test(pathname)
  useEffect(()=>{const sync=()=>window.ParlorConsent?.setPage(pathname);sync();window.addEventListener('parlor-consent-ready',sync);return()=>window.removeEventListener('parlor-consent-ready',sync)},[pathname])
  useEffect(()=>{const refresh=()=>{const accepted=window.ParlorConsent?.analytics()===true;setAllowed(accepted);if(window.__parlorGoogleConsent && consent.current!==(accepted?'granted':'denied')){consent.current=accepted?'granted':'denied';window.gtag('consent','update',{analytics_storage:consent.current,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})}};refresh();window.addEventListener('parlor-consent-ready',refresh);window.addEventListener('parlor-consent-change',refresh);return()=>{window.removeEventListener('parlor-consent-ready',refresh);window.removeEventListener('parlor-consent-change',refresh)}},[])
  useEffect(()=>{
    if(!publicPage)return
    const analyticsId=/^G-[A-Z0-9]+$/.test(id)?id:null
    if(navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl)return
    initializeGoogleConsent(window)
    // Read current persisted consent directly to avoid a transient stale React value.
    const accepted=window.ParlorConsent?.analytics()===true
    const next=accepted?'granted':'denied'
    if(consent.current!==next){consent.current=next;window.gtag('consent','update',{analytics_storage:next,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})}
    window.dataLayer=window.dataLayer||[]
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)}
    if(!loaded.current){loaded.current=true;window.gtag('js',new Date());window.gtag('config',adsId,{page_location:location.origin+pathname,page_referrer:'',allow_ad_personalization_signals:false});if(analyticsId)window.gtag('config',analyticsId,{send_page_view:false,page_location:location.origin+pathname,page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false});const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(analyticsId||adsId);script.id='parlor-ga4';document.head.append(script)}
    if(analyticsId&&last.current!==pathname){last.current=pathname;window.gtag('event','page_view',{send_to:id,page_location:location.origin+pathname,page_referrer:'',page_title:document.title})}
  },[allowed,pathname,id,publicPage])
  return <><Script src="/cookie-consent.js" strategy="afterInteractive" />{allowed&&<><PageViewTracker/><LiveSessionTracker/><SubscriberSiteTracker/></>}</>
}
