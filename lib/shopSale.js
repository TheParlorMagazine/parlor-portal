// Shared integer-cent sale calculation. Stored prices always remain the regular prices.
export function shopSalePercent(product) {
 const n=Number(product?.sale_discount_percent || 0)
 return Number.isInteger(n)&&n>0&&n<100?n:0
}
export function shopSaleAmount(amount,percent){
 const cents=Math.round(Number(amount || 0)*100)
 return Math.round(cents*(100-percent)/100)/100
}
// Existing pick-your-own products keep their historical bundle-only checkout discount by default.
export function shopSaleScope(product){return product?.bundle_config?(product.bundle_config.sale_scope==='items'?'items':'bundle'):'items'}
export function shopItemSalePercent(product){return shopSaleScope(product)==='items'?shopSalePercent(product):0}
export function shopBundleSalePercent(product){return product?.bundle_config&&shopSaleScope(product)==='bundle'?shopSalePercent(product):0}
export function saleShopProduct(product){
 const percent=shopSalePercent(product)
 if(percent&&(product.external_url||product.fulfillment==='external'))return {...product,sale_discount_percent:0}
 if(!percent||product.sale_applied)return product
 const prices=(value,discount)=>{const out={...value};for(const key of ['price','price_eur','price_gbp'])if(value[key]!=null&&discount){out[`regular_${key}`]=value[key];out[key]=shopSaleAmount(value[key],discount)}return out}
 const individual=shopItemSalePercent(product),bundle=shopBundleSalePercent(product)
 return {...prices(product,individual),sale_applied:true,variants:Array.isArray(product.variants)?product.variants.map(value=>prices(value,individual)):product.variants,bundle_config:product.bundle_config?{...prices(product.bundle_config,bundle),sale_discount_percent:bundle}:product.bundle_config}
}
// Use the better single-item offer without stacking discounts or changing the child's global price.
export function salePickProduct(parent,pick){
 if(!pick)return pick
 const percent=Math.max(shopItemSalePercent(parent),shopItemSalePercent(pick))
 if(percent===shopItemSalePercent(pick))return saleShopProduct(pick)
 const restore=value=>{const out={...value};for(const key of ['price','price_eur','price_gbp'])if(value[`regular_${key}`]!=null)out[key]=value[`regular_${key}`];return out}
 return saleShopProduct({...restore(pick),sale_applied:false,sale_discount_percent:percent,variants:Array.isArray(pick.variants)?pick.variants.map(restore):pick.variants})
}
// Older databases remain readable while the additive sale migration is being installed.
export async function queryShopSale(fields,query){
 let result=await query(`${fields}, sale_discount_percent`)
 if(result.error&&['42703','PGRST204'].includes(result.error.code)&&/sale_discount_percent/.test(result.error.message || ''))result=await query(fields)
 return result
}

// Public catalogue amounts are already discounted; choose the matching currency without discounting twice.
export function displayShopPrice(product,currency='usd',regular=false){
 const field=currency==='eur'?'price_eur':currency==='gbp'?'price_gbp':'price'
 const prefix=regular?'regular_':''
 return Number(product?.[prefix+field] ?? product?.[prefix+'price'] ?? product?.[field] ?? product?.price ?? 0)
}
