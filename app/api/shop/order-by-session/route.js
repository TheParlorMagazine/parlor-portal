import Stripe from 'stripe'
import { serviceClient } from '../../../../lib/apiAuth'
import { requireShopUser } from '../../../../lib/shopAuth'
import { fulfillShopPurchase } from '../../../../lib/fulfillShopPurchase'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET(request) {
  const user = await requireShopUser(request)
  if (!user) return Response.json({ error: 'Sign in to view your order.' }, { status: 401 })
  const sessionId = new URL(request.url).searchParams.get('session_id')
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId || '')) return Response.json({ error: 'Invalid checkout reference.' }, { status: 400 })
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const owner = session.metadata?.userId || session.client_reference_id
    const guestMatch = !owner && user.email_confirmed_at && user.email?.toLowerCase() === session.customer_details?.email?.toLowerCase()
    if (owner !== user.id && !guestMatch) return Response.json({ error: 'Order not found.' }, { status: 404 })
    if (!['shop_order','tot_bundle'].includes(session.metadata?.kind)) return Response.json({ error: 'Order not found.' }, { status: 404 })
    const result = await fulfillShopPurchase(stripe,session)
    if (result.status !== 'confirmed') return Response.json({ order: null, status: 'pending' }, { status: 202 })
    const db = serviceClient()
    if (guestMatch) {
      const {error}=await db.from('orders').update({member_id:user.id}).eq('id',result.order.id).is('member_id',null)
      if(error)throw error
    }
    const {data:order,error}=await db.from('orders').select('id,order_number,status,subtotal_cents,shipping_cents,total_cents,currency,shipping_name,shipping_address,placed_at').eq('id',result.order.id).eq('member_id',user.id).single()
    if(error || !order)return Response.json({error:'Order not found.'},{status:404})
    const {data:items,error:itemError}=await db.from('order_items').select('product_name,variant,quantity,unit_price_cents,image_url').eq('order_id',order.id)
    if(itemError)throw itemError
    return Response.json({order:{...order,items:items || []}},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('Order confirmation failed:',error.message);return Response.json({error:'We could not confirm the order yet. Please do not pay again.'},{status:503})}
}
