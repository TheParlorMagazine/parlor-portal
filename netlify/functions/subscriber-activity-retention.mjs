// Modern Netlify Functions API: runtime secrets are read through Netlify.env.
export default async()=>{
  const origin=Netlify.env.get('INVENTORY_RECONCILE_ORIGIN') || Netlify.env.get('URL')
  const secret=Netlify.env.get('ACTIVITY_RETENTION_SECRET') || Netlify.env.get('INVENTORY_RECONCILE_SECRET') || Netlify.env.get('CRON_SECRET')
  if(!origin || !secret)throw Error('Subscriber activity cleanup is not configured.')
  const response=await fetch(new URL('/api/internal/subscriber-activity-retention',origin),{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(24000)})
  if(!response.ok)throw Error('Subscriber activity cleanup failed: '+response.status)
  return new Response(null, {status:200})
}
