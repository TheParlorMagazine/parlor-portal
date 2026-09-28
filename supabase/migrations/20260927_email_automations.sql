-- Email automations: one row per system email, driving the on/off toggles in
-- admin Email Management → Automations. The send-time gate (lib/sendEmail.js)
-- reads `enabled`; critical transactional emails (password reset, payment)
-- ignore it and always send. Run once in Supabase → SQL Editor.

create table if not exists email_automations (
  id           text primary key,          -- matches lib/emailTypes.js `type`
  enabled      boolean not null default true,
  last_sent_at timestamptz,
  sent_count   integer not null default 0,
  updated_at   timestamptz default now()
);

-- Editable template overrides are keyed by template_type (so the admin can save
-- one override per email). Enables upsert(onConflict: 'template_type').
create unique index if not exists email_templates_template_type_key on email_templates (template_type);

insert into email_automations (id, enabled) values
  ('welcome', true),
  ('weekly_digest', false),
  ('password_reset', true),
  ('payment_confirmed', true),
  ('payment_failed', true),
  ('plan_upgraded', true),
  ('cancellation', true),
  ('event_rsvp', true),
  ('event_reminder', true),
  ('forum_invite', true),
  ('order_shipped', true),
  ('print_shipped', true)
on conflict (id) do nothing;
