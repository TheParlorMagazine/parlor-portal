-- Adds a Stripe customer reference to members so subscription lifecycle
-- events (e.g. cancellation) that only carry a Stripe customer id — not our
-- own member id — can still be matched back to the right member.
-- Run once in Supabase dashboard → Database → SQL Editor.

alter table members
  add column if not exists stripe_customer_id text;

create index if not exists members_stripe_customer_id_idx on members(stripe_customer_id);
