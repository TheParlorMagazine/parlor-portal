exports.handler=async()=>{
  const origin=process.env.INVENTORY_RECONCILE_ORIGIN || process.env.URL
  const secret=process.env.ACTIVITY_RETENTION_SECRET || process.env.INVENTORY_RECONCILE_SECRET || process.env.CRON_SECRET
  if(!origin || !secret)throw Error('Subscriber activity cleanup is not configured.')
  const response=await fetch(new URL('/api/internal/subscriber-activity-retention',origin),{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(24000)})
  if(!response.ok)throw Error('Subscriber activity cleanup failed: '+response.status)
  return{statusCode:200}
}
