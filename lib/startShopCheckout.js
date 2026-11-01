import { createClient } from './supabase'

export async function startShopCheckout({requestId,payload}) {
  const returnTo='/checkout/shop?intent='+encodeURIComponent(requestId)
  const {data:{session}}=await createClient().auth.getSession()
  if(!session){window.location.href='/signup?returnTo='+encodeURIComponent(returnTo);return}
  const response=await fetch('/api/shop/checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({...payload,requestId})})
  if(response.status===401){window.location.href='/login?returnTo='+encodeURIComponent(returnTo);return}
  const result=await response.json()
  if(!response.ok || !result.url)throw new Error(result.error || 'Checkout could not be opened. Please review your cart.')
  if (result.sessionId) {
    try {
      const pending=JSON.parse(localStorage.getItem('parlor-purchase:'+requestId) || 'null')
      if(Array.isArray(pending?.cartSnapshot))localStorage.setItem('parlor-checkout-cart:'+result.sessionId,JSON.stringify(pending.cartSnapshot))
    } catch {}
  }
  window.location.href=result.url
}
