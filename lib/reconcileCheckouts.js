import { checkItemAccess } from './checkAccess'
import { itemPriceMatches } from './itemPurchasePrice'
import { observeStripeCheckout } from './checkoutReservations'
import { serviceClient } from './apiAuth'
import { recoverReservationSession } from './checkoutReservations'
import { fulfillShopPurchase } from './fulfillShopPurchase'
import { fulfillItemPurchase } from './itemPurchase'

export async function reconcileCheckoutRows(stripe,{limit=5,sessionId=null}={}) {
 const db=serviceClient()
 let query=db.from('checkout_reservations').select('*').in('state',['creating','open','pending','paid'])
 if(sessionId)query=query.eq('stripe_session_id',sessionId)
 const {data:rows,error}=await query.order('checked_at',{ascending:true,nullsFirst:true}).limit(limit)
 if(error)throw new Error('Allocations could not be loaded')
 const results=[]
 await Promise.all((rows || []).map(async row => {
  try {
   let session=await recoverReservationSession(db,stripe,row)
   if(row.kind==='digital' && session?.status==='open') {
     const meta=session.metadata || {}
     const {data:article,error}=await db.from('articles').select('published,paywall_type,stripe_price_id,body').eq('id',meta.articleId).maybeSingle()
     if(error)throw new Error('Article availability could not be checked')
     const access=await checkItemAccess(row.member_id,meta.articleId,meta.itemType,{db,strict:true})
     if(!article?.published || !itemPriceMatches(article,meta.itemType,row.stripe_params.line_items[0].price) || access.hasAccess) session=await observeStripeCheckout(db,stripe,row,null,{forceExpire:true})
   }
   if(session?.payment_status==='paid' && session.status==='complete') {
    if(row.kind==='digital')await fulfillItemPurchase(session,{retryReceipt:true})
    else await fulfillShopPurchase(stripe,session,{retryReceipt:true})
   }
   results.push({id:row.id,ok:true})
  }catch(error){results.push({id:row.id,ok:false});console.error('Checkout reconciliation needs retry:',row.id,error.message)}
  // Rotate errors as well; one provider outage must not starve newer holds.
  await db.from('checkout_reservations').update({checked_at:new Date().toISOString()}).eq('id',row.id)
 }))
 return results
}
