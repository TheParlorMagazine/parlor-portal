export const paidPlanDefinitions = {
  circle: ["Reader's Circle", 'readers_circle', 'circle', 'readers-circle'],
  press: ['Printing Press', 'printing_press', 'press', 'print'],
}
export function paidPlanKey(plan) {
  const value=String(plan||'').toLowerCase()
  return Object.keys(paidPlanDefinitions).find(key=>paidPlanDefinitions[key].some(p=>p.toLowerCase()===value))||null
}
export function paidMembershipStatus(member) {
  const status=String(member.subscription_status||member.status||'active').toLowerCase()
  return ['churned','cancelled','canceled','expired','unpaid','incomplete_expired'].includes(status)?'churned':status
}
export function planSubscriberRows(key,current,history) {
  const rows=new Map()
  for(const h of history){const m=h.members;if(m&&h.ended_at)rows.set(m.id,{...m,plan_status:'churned',plan_ended_at:h.ended_at})}
  for(const m of current)rows.set(m.id,{...m,plan_status:paidMembershipStatus(m)})
  return [...rows.values()].sort((a,b)=>String(b.joined_at||'').localeCompare(String(a.joined_at||'')))
}
