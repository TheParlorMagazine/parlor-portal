-- Where a paid member's subscription is billed. Members migrated from Wix/MailerLite
-- keep their billing on Wix (at different prices than our in-app Stripe plans), while
-- future sign-ups check out through Stripe in-app. billing_source + stripe_subscription_id
-- let the admin tell the two apart and show a "Managed on Wix" badge.
alter table public.members add column if not exists billing_source       text;  -- 'wix' | 'stripe' | null
alter table public.members add column if not exists stripe_subscription_id text;  -- set when billing runs through Stripe

-- Backfill: every existing PAID member right now is a Wix-managed migration.
update public.members
  set billing_source = 'wix'
  where billing_source is null
    and plan is not null
    and lower(plan) <> 'free'
    and stripe_subscription_id is null;
