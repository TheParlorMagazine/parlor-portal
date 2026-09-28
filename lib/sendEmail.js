import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { EMAIL_TYPE_MAP } from './emailTypes'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'The Parlor <onboarding@resend.dev>'

function db() {
  try {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  } catch { return null }
}

// {{var}} interpolation for admin-authored template overrides.
function interpolate(tpl, vars) {
  return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars && k in vars && vars[k] != null) ? String(vars[k]) : '')
}

// Single choke point for every email. Honors the Automations toggle (critical
// types always send), applies an admin-authored template override from
// email_templates when present, sends via Resend, and records the send.
//   deliver({ type, to, subject, html, vars?, critical? })
export async function deliver({ type, to, subject, html, vars = {}, critical }) {
  const def = EMAIL_TYPE_MAP[type] || {}
  const isCritical = critical ?? def.critical ?? false
  const supa = db()

  // 1) Toggle gate — skip non-critical emails that are switched off.
  if (supa && !isCritical) {
    try {
      const { data: a } = await supa.from('email_automations').select('enabled').eq('id', type).maybeSingle()
      const enabled = a ? a.enabled !== false : (def.defaultEnabled ?? true)
      if (!enabled) return { skipped: true, reason: 'disabled', type }
    } catch {}
  }

  // 2) Admin template override (else the built-in design passed as `html`).
  let finalSubject = subject
  let finalHtml = html
  if (supa) {
    try {
      const { data: t } = await supa.from('email_templates').select('subject, body_html').eq('template_type', type).maybeSingle()
      if (t?.body_html) finalHtml = interpolate(t.body_html, vars)
      if (t?.subject) finalSubject = interpolate(t.subject, vars)
    } catch {}
  }

  // 3) Send.
  const res = await resend.emails.send({ from: FROM, to, subject: finalSubject, html: finalHtml })

  // 4) Record (best-effort; never blocks the send).
  if (supa) {
    try {
      const { data: cur } = await supa.from('email_automations').select('sent_count').eq('id', type).maybeSingle()
      if (cur) await supa.from('email_automations').update({ sent_count: (cur.sent_count || 0) + 1, last_sent_at: new Date().toISOString() }).eq('id', type)
    } catch {}
  }
  return res
}
