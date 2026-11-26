// Modern Netlify Functions API: runtime secrets are read through Netlify.env.
// Netlify runs scheduled functions on the published production deploy only.
export default async () => {
 const secret=Netlify.env.get('INVENTORY_RECONCILE_SECRET'),origin=Netlify.env.get('INVENTORY_RECONCILE_ORIGIN') || Netlify.env.get('URL')
 if(!secret || !origin)throw new Error('Film ticket maintenance environment is missing')
 const response=await fetch(new URL('/api/internal/film-ticket-maintenance',origin),{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(24000)})
 if(!response.ok)throw new Error('Film ticket maintenance returned '+response.status)
 const result=await response.json()
 if(result.archive?.failed || result.fees?.unavailable)console.error('Film tickets need another maintenance pass')
 return Response.json(result)
}
