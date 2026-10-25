// Netlify runs scheduled functions on the published production deploy only.
exports.handler = async () => {
 const secret=process.env.INVENTORY_RECONCILE_SECRET,origin=process.env.INVENTORY_RECONCILE_ORIGIN || process.env.URL
 if(!secret || !origin)throw new Error('Inventory reconciliation environment is missing')
 const response=await fetch(new URL('/api/internal/reconcile-checkouts',origin),{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(24000)})
 if(!response.ok)throw new Error('Inventory reconciliation returned '+response.status)
 const result=await response.json()
 if(result.failed)console.error('Inventory holds needing another reconciliation:',result.failed)
 return {statusCode:200,body:JSON.stringify(result)}
}
