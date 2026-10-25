'use client'
import { Suspense,useEffect,useRef,useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { startShopCheckout } from '../../../lib/startShopCheckout'
function Checkout(){
 const params=useSearchParams(),started=useRef(false),[error,setError]=useState('')
 async function proceed(){
  setError('')
  try {
   const id=params.get('intent')
   if(!/^[0-9a-f-]{36}$/i.test(id || ''))throw new Error('This checkout link is invalid. Please return to your cart.')
   const pending=JSON.parse(localStorage.getItem('parlor-purchase:'+id) || 'null')
   if(!pending || pending.kind!=='shop' || !Number.isFinite(pending.savedAt) || pending.savedAt>Date.now()+60000 || pending.savedAt<Date.now()-3600000){localStorage.removeItem('parlor-purchase:'+id);throw new Error('This saved checkout expired or belongs to another browser. Please review your cart to continue.')}
   await startShopCheckout({requestId:id,payload:pending.payload})
  }catch(e){setError(e.message || 'Could not continue checkout.')}
 }
 useEffect(()=>{if(started.current)return;started.current=true;proceed()},[])
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Georgia, serif'}}><div style={{maxWidth:440,textAlign:'center'}}><h1>{error?'Checkout needs your attention':'Opening secure checkout…'}</h1>{error?<><p role="alert">{error}</p><button style={{font:'inherit'}} onClick={proceed}>Try again</button></>:<p>Preparing your saved purchase.</p>}<p><a href="/shop?cart=1">Return to your cart</a></p></div></main>
}
export default function Page(){return <Suspense fallback={<p>Preparing checkout…</p>}><Checkout/></Suspense>}
