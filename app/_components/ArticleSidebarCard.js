'use client'
import TrickOrTreatStrip from './TrickOrTreatStrip'
import BonesCoffeeBanner from './BonesCoffeeBanner'
import { safePopupUrl } from '../../lib/shopPopup'
export default function ArticleSidebarCard({item,visible}){
 const {config}=item,store=config.format==='store',href=safePopupUrl(item.cta_href)||'/shop'
 return <aside className={`article-sidebar article-sidebar-${config.side} article-sidebar-${config.format}${!store&&config.legacy_animation?' article-sidebar-original-animation':''}${visible?' shown':''}`} data-side={config.side} aria-label={`${config.side==='left'?'Left':'Right'} article sidebar`}>
  {store?<BonesCoffeeBanner embedded visible={visible} products={item.products||[]} headline={item.headline} kicker={item.kicker||''} message={item.message||''} ctaLabel={item.cta_label||'From the Parlor Shop'} ctaHref={href}/>:config.legacy_animation?<TrickOrTreatStrip embedded copy={item} href={safePopupUrl(item.cta_href)||'/trick-or-treat'}/>:<div className="article-sidebar-card">
   {item.kicker&&<div className="article-sidebar-kicker">{item.kicker}</div>}
   <h2>{item.headline}</h2>
   {item.message&&<p>{item.message}</p>}
   <div className="article-sidebar-media">{config.media.map((media,index)=>safePopupUrl(media.url)?media.kind==='video'?<video key={index} src={media.url} controls playsInline preload="none" aria-label={media.alt||'Announcement video'}/>:<img key={index} src={media.url} alt={media.alt||''}/>:null)}</div>{item.cta_label&&item.cta_href&&safePopupUrl(item.cta_href)&&<a className="article-sidebar-cta" href={item.cta_href}>{item.cta_label}</a>}
  </div>}
 </aside>
}
