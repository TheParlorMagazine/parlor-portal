'use client'
import { useState,useEffect } from 'react'
import TrickOrTreatStrip from './TrickOrTreatStrip'
import ShopPopupCard from './ShopPopupCard'
import { DEFAULT_SHOP_POPUP,popupIsLive,popupDismissKey,popupMedia,safePopupUrl } from '../../lib/shopPopup'
export default function ShopTrickOrTreatPopup({heroSelector='#shop-featured-product'}){
 const [announcement,setAnnouncement]=useState(null),[dismissed,setDismissed]=useState(false)
 useEffect(()=>{
  let live=true,requestVersion=0
  async function load(){const version=++requestVersion;try{
   const response=await fetch('/api/announcements/shop-popup',{cache:'no-store'})
   if(!response.ok)throw Error('Popup unavailable')
   const result=await response.json();if(!result.announcement)throw Error('Popup unavailable')
   const item={...DEFAULT_SHOP_POPUP,...result.announcement}
   item.cta_href=safePopupUrl(item.cta_href,{link:true})||DEFAULT_SHOP_POPUP.cta_href
   let hidden=false;try{hidden=sessionStorage.getItem(popupDismissKey(item))==='1'}catch{}
   if(live&&version===requestVersion){setAnnouncement(item);setDismissed(hidden)}
  }catch{if(live&&version===requestVersion)setAnnouncement(null)}}
  load();window.addEventListener('focus',load)
  return()=>{live=false;window.removeEventListener('focus',load)}
 },[])
 function dismiss(){try{sessionStorage.setItem(popupDismissKey(announcement),'1')}catch{}setDismissed(true)}
 if(!announcement||dismissed||!popupIsLive(announcement))return null
 const media=popupMedia(announcement.image_url)
 return media.length?<ShopPopupCard announcement={announcement} media={media} onDismiss={dismiss} heroSelector={heroSelector}/>:<TrickOrTreatStrip shopPopup copy={announcement} href={announcement.cta_href} onDismiss={dismiss} heroSelector={heroSelector} bottomSelector="#shop-popup-no-bottom-trigger"/>
}
