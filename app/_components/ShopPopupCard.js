'use client'
import { useEffect,useState } from 'react'
export default function ShopPopupCard({announcement,media,onDismiss,heroSelector}){
 const [mobile,setMobile]=useState(false),[heroGone,setHeroGone]=useState(false)
 useEffect(()=>{const update=()=>setMobile(innerWidth<=1100);update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update)},[])
 useEffect(()=>{const hero=document.querySelector(heroSelector);if(!hero){setHeroGone(true);return}const observer=new IntersectionObserver(([entry])=>setHeroGone(!entry.isIntersecting));observer.observe(hero);return()=>observer.disconnect()},[heroSelector])
 if(mobile&&!heroGone)return null
 return <aside className="shop-announcement-card" aria-label="Shop announcement">
  <style>{`.shop-announcement-card{position:fixed;left:16px;bottom:var(--parlor-shop-popup-bottom,16px);width:280px;max-width:calc(100vw - 32px);max-height:calc(100dvh - var(--parlor-shop-popup-bottom,16px) - 20px);overflow:auto;box-sizing:border-box;z-index:90;border:1px solid #72545c;border-radius:14px;background:#101010;color:#f2b8c6;box-shadow:0 8px 30px #0003;padding:24px 12px 12px;font-family:'Source Serif 4',Georgia,serif}.shop-announcement-card h2{font-family:'Playfair Display',Georgia,serif;white-space:pre-line;font-size:21px;text-align:center;margin:0 14px 14px}.shop-announcement-card p{white-space:pre-line;font-size:14px;line-height:1.5}.shop-announcement-card .shop-popup-close{position:absolute;right:7px;top:6px;width:28px;height:28px;border:1px solid #72545c;border-radius:50%;background:#111;color:#f2b8c6;font-size:22px;line-height:1;cursor:pointer}.shop-popup-media{display:grid;gap:10px}.shop-popup-media img,.shop-popup-media video{display:block;width:100%;max-height:220px;object-fit:contain;border-radius:8px;background:#000}.shop-popup-link{display:block;text-align:center;background:#f2b8c6;color:#111;padding:12px;margin-top:14px;text-decoration:none;font-size:13px;font-weight:700}.shop-announcement-card :focus-visible{outline:2px solid #f2b8c6;outline-offset:3px}@media(max-width:1100px){.shop-announcement-card{max-height:min(60dvh,calc(100dvh - var(--parlor-shop-popup-bottom,16px) - 20px))}}`}</style>
  <button type="button" className="shop-popup-close" onClick={onDismiss} aria-label="Dismiss shop announcement">×</button>
  {announcement.kicker&&<p>{announcement.kicker}</p>}
  <h2>{announcement.headline}</h2>
  {announcement.message&&<p>{announcement.message}</p>}
  <div className="shop-popup-media">{media.map((item,index)=>item.kind==='video'?<video key={item.url+index} src={item.url} controls playsInline preload="none" aria-label={item.alt||'Announcement video'}/>:<img key={item.url+index} src={item.url} alt={item.alt||''}/>)}</div>
  <a className="shop-popup-link" href={announcement.cta_href}>{announcement.cta_label}</a>
 </aside>
}
