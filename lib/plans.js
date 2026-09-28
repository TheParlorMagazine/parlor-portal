// Whether a member's plan grants paid access (Reader's Circle / Printing Press,
// in any stored spelling). Free / null plans are not paid.
export function isPaidPlan(plan) {
  if (!plan) return false
  if (/^free$/i.test(plan.trim())) return false
  return /reader|printing|circle|press|print/i.test(plan)
}

// Admin/team members get full access to paid features regardless of plan.
const TEAM_ROLES = ['admin', 'editor', 'writer', 'finance_admin', 'social_admin']

// Whether a member (row with { plan, role }) has paid access — either a paid
// plan, or an admin/team role. Use this for all paid-content gates.
export function hasPaidAccess(member) {
  if (!member) return false
  if (TEAM_ROLES.includes(member.role)) return true
  return isPaidPlan(member.plan)
}
