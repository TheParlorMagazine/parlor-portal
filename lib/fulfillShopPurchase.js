import { decodeShopSnapshot } from './shopSnapshot'
import { serviceClient } from './apiAuth'
import { sendStripeEmailOnce } from './stripeEmail'
import { sendOrderConfirmationEmail } from './emails'
import { printifyConfigured, resolveShopId, createOrder } from './printify'

const formatAddress = a => [a.line1,a.line2,[a.city,a.state,a.postal_code].filter(Boolean).join(' '),a.country].filter(Boolean).join('\n')
export async function fulfillShopPurchase(stripe, session, { retryReceipt = false } = {}) {
  if (session.mode !== 'payment' || session.payment_status !== 'paid' || session.status !== 'complete') return { status: 'pending' }
  const db = serviceClient(), kind = session.metadata?.kind
  if (!['shop_order','tot_bundle'].includes(kind)) throw new Error('Unknown shop checkout')
  const memberId = session.metadata?.userId || session.client_reference_id || null
  let ship = session.collected_information?.shipping_details || session.shipping_details
  if (!ship?.address?.line1 && session.payment_intent) {
    const payment = await stripe.paymentIntents.retrieve(typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id)
    ship = payment.shipping
  }
  // Completed orders can be retried even after a bundle/product was edited or
  // removed. Read their durable lines before attempting catalogue reconstruction.
  const {data:savedOrder,error:savedError} = await db.from('orders').select('*').eq('stripe_session_id',session.id).maybeSingle()
  if (savedError) throw new Error('Existing paid order could not be checked')
  let savedRows = null
  if (savedOrder) {
    const {data,error} = await db.from('order_items').select('*').eq('order_id',savedOrder.id)
    if (error) throw new Error('Existing paid order items could not be checked')
    if (data?.length && Array.isArray(savedOrder.metadata?.packing_items)) savedRows = data
  }
  const rows=[], printify=[], inventory=[], packing=[]
  function component(p, quantity, variantId, bundleName = null) {
    if (!p) throw new Error('Purchased product is missing')
    const selectedVariantId = variantId ?? p.printify_variant_id
    const variant = p.variants?.find(v => String(v.printify_variant_id) === String(selectedVariantId)) || (!selectedVariantId ? p.variants?.[0] : null)
    const vid = variant?.printify_variant_id || variantId || p.printify_variant_id
    const pid = variant?.printify_product_id || p.printify_product_id
    inventory.push({ product_id:p.id, quantity, variant_id:vid })
    packing.push({ product_id:p.id, product_name:p.name, variant:variant?.name || p.variant || null, sku:variant?.sku || p.sku || null, quantity, fulfillment:p.fulfillment === 'printify' ? 'printify' : 'manual', printify_product_id:pid || null, printify_variant_id:vid || null, bundle_name:bundleName })
    if (p.fulfillment === 'printify') {
      if (!pid || !vid) throw new Error('Purchased product needs a Printify mapping')
      printify.push({ product_id:pid, variant_id:Number(vid), quantity })
    }
  }
  const treatIds = kind === 'tot_bundle' ? (session.metadata.treat_ids || '').split(',').filter(Boolean) : []
  function purchasedParts(parts) {
    for (const part of parts) {
      packing.push(part)
      if (part.product_id) inventory.push({product_id:part.product_id,quantity:part.quantity,variant_id:part.printify_variant_id})
      if (part.fulfillment === 'printify') {
        if (!part.printify_product_id || !part.printify_variant_id) throw new Error('Purchased product needs a Printify mapping')
        printify.push({product_id:part.printify_product_id,variant_id:Number(part.printify_variant_id),quantity:part.quantity})
      }
    }
  }
  const totSnapshot = kind === 'tot_bundle' ? decodeShopSnapshot(session.metadata) : null
  if (savedRows) { rows.push(...savedRows); purchasedParts(savedOrder.metadata.packing_items) }
  else if (totSnapshot) {
    purchasedParts(totSnapshot)
    for (const p of totSnapshot) rows.push({product_name:p.product_name,variant:p.variant || null,quantity:p.quantity,unit_price_cents:0,image_url:p.image_url || null})
  } else if (kind === 'tot_bundle') {
    const { data: treats,error } = await db.from('tot_treats').select('id,name,shop_products(*)').in('id',treatIds)
    if (error || treats?.length !== treatIds.length) throw new Error('Purchased treats could not be loaded')
    for (const t of treats) {
      if (t.shop_products) component(t.shop_products,1,null,'Trick-or-Treat bundle')
      else packing.push({product_name:t.name,quantity:1,fulfillment:'manual',bundle_name:'Trick-or-Treat bundle'})
      rows.push({product_name:t.shop_products?.name || t.name,quantity:1,unit_price_cents:0,image_url:t.shop_products?.images?.[0] || null})
    }
    const standalone=(session.metadata.standalone_product_ids || '').split(',').filter(Boolean)
    if (standalone.length) {
      const { data: products,error }=await db.from('shop_products').select('*').in('id',standalone)
      if(error || products?.length!==standalone.length) throw new Error('Included products could not be loaded')
      for(const p of products){component(p,1,null,'Trick-or-Treat bundle');rows.push({product_name:p.name,quantity:1,unit_price_cents:0,image_url:p.images?.[0] || null})}
    }
  } else {
    const lines=await stripe.checkout.sessions.listLineItems(session.id,{expand:['data.price.product'],limit:100})
    if(lines.has_more) throw new Error('Checkout has more lines than expected')
    for(const line of lines.data || []) {
      const product=line.price?.product,md=product?.metadata || {},qty=line.quantity || 1
      rows.push({product_name:line.description || product?.name || 'Item',variant:md.variant_name || null,quantity:qty,unit_price_cents:line.price?.unit_amount ?? Math.round(line.amount_subtotal/qty),image_url:product?.images?.[0] || null,stripe_price_id:line.price?.id || null,shop_product_id:md.shop_product_id || null,printify_product_id:md.printify_product_id || null,printify_variant_id:md.printify_variant_id ? Number(md.printify_variant_id) : null})
      const snapshot = decodeShopSnapshot(md)
      if(snapshot) { purchasedParts(snapshot) }
      else if(md.fulfillment==='bundle') {
        const {data:bundle,error}=await db.from('shop_bundles').select('shop_bundle_items(quantity,variant_id,shop_products(*))').eq('id',md.shop_bundle_id).single()
        if(error || !bundle?.shop_bundle_items?.length) throw new Error('Purchased bundle could not be loaded')
        for(const part of bundle.shop_bundle_items)component(part.shop_products,qty*(part.quantity || 1),part.variant_id,product?.name || line.description || 'Bundle')
      } else if(md.fulfillment==='pick_bundle') {
        const ids=(md.bundle_pick_ids || '').split(',').filter(Boolean)
        const {data:picks,error}=await db.from('shop_products').select('*').in('id',[...new Set(ids)])
        if(error || picks?.length!==new Set(ids).size || !ids.length)throw new Error('Purchased selections could not be loaded')
        for(const id of ids)component(picks.find(p=>p.id===id),qty,null,product?.name || line.description || 'Bundle')
      } else {
        packing.push({product_id:md.shop_product_id || null,product_name:product?.name || line.description || 'Item',variant:md.variant_name || null,sku:md.sku || null,printify_product_id:md.printify_product_id || null,printify_variant_id:md.printify_variant_id || null,quantity:qty,fulfillment:md.fulfillment === 'printify' ? 'printify' : 'manual',bundle_name:null})
        if(md.shop_product_id)inventory.push({product_id:md.shop_product_id,quantity:qty,variant_id:md.printify_variant_id || null})
        if(md.fulfillment==='printify') {
          if(!md.printify_product_id || !md.printify_variant_id)throw new Error('Missing fulfillment mapping')
          printify.push({product_id:md.printify_product_id,variant_id:Number(md.printify_variant_id),quantity:qty})
        }
      }
    }
  }
  const {data:order,error}=await db.rpc('record_paid_shop_order',{
    p_session_id:session.id,p_items:rows,p_treat_ids:treatIds,
    p_order:{member_id:memberId,payment_intent:typeof session.payment_intent==='string'?session.payment_intent:null,email:session.customer_details?.email || null,shipping_name:ship?.name || session.customer_details?.name || null,shipping_address:ship?.address?.line1?formatAddress(ship.address):null,subtotal_cents:session.amount_subtotal ?? session.amount_total,shipping_cents:session.shipping_cost?.amount_total ?? session.total_details?.amount_shipping ?? 0,total_cents:session.amount_total,currency:session.currency || 'usd',metadata:{packing_items:packing,kind,collection_id:session.metadata?.collection_id || null,treat_ids:treatIds,standalone_product_ids:(session.metadata?.standalone_product_ids || '').split(',').filter(Boolean)},inventory},
  })
  if(error || !order)throw new Error('Paid order could not be saved')
  // A replay must never re-open an order staff already cancelled or completed.
  if (['cancelled','shipped','fulfilled'].includes(order.status)) return { status: 'confirmed', order }
  // Claim the outbound fulfillment once, before making a request that could time
  // out after Printify accepted it. Unknown outcomes require review, not resubmission.
  const savedPacking = order.metadata?.packing_items
  const fulfillmentLines = Array.isArray(savedPacking)
    ? savedPacking.filter(item => item.fulfillment === 'printify').map(item => ({ product_id:item.printify_product_id, variant_id:Number(item.printify_variant_id), quantity:item.quantity }))
    : printify
  if(fulfillmentLines.length && !order.printify_order_id && !order.metadata?.stock_review_required) {
    if(!printifyConfigured() || !ship?.address?.line1) {
      await db.from('orders').update({printify_status:'needs_review'}).eq('id',order.id).is('printify_status',null)
    } else {
      const {data:claim,error:claimError}=await db.from('orders').update({printify_status:'submitting'}).eq('id',order.id).is('printify_status',null).select('id').maybeSingle()
      if(claimError)throw new Error('Fulfillment could not be claimed')
      if(claim) {
        try {
          const shop=await resolveShopId();if(!shop)throw new Error('No Printify shop')
          const [first_name,...rest]=(ship.name || session.customer_details?.name || 'Customer').trim().split(/\s+/),a=ship.address
          const result=await createOrder(shop,{external_id:session.id,line_items:fulfillmentLines,shipping_method:1,send_shipping_notification:false,address_to:{first_name,last_name:rest.join(' ') || '—',email:session.customer_details?.email || order.email,phone:session.customer_details?.phone || '',country:a.country,region:a.state || '',address1:a.line1,address2:a.line2 || '',city:a.city || '',zip:a.postal_code || ''}})
          if(!result?.id)throw new Error('No fulfillment confirmation')
          const {error:saved}=await db.from('orders').update({printify_order_id:String(result.id),printify_status:'submitted'}).eq('id',order.id)
          if(saved)throw saved
        }catch(error){
          await db.from('orders').update({printify_status:'needs_review'}).eq('id',order.id)
          console.error('Paid Printify order requires review:',order.id,error.message)
        }
      }
    }
  }
  const to=session.customer_details?.email || order.email
  if(to) {
    try {
      const receipt=await sendStripeEmailOnce({eventId:session.id,type:'shop_order_confirmation',to,send:()=>sendOrderConfirmationEmail({to,name:order.shipping_name,order,items:rows})})
      if(receipt?.trackingStatus==='failed')throw new Error('Order receipt was rejected; retry required')
    } catch(error) {
      // Stripe retries delivery; the return page still confirms saved paid orders.
      if(retryReceipt)throw error
      console.error('Shop receipt needs delivery review:',order.id,error.message)
    }
  }
  return {status:'confirmed',order}
}
