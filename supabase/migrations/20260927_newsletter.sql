-- Newsletter + campaigns. This migration is self-contained and idempotent:
-- it creates email_campaigns if it was never created, adds the newsletter
-- 'kind' marker, the events "feature in newsletter" flag, and the members
-- opt-out columns the send path relies on.
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- 1) Events: drives the newsletter's top banner.
alter table events add column if not exists featured_in_newsletter boolean default false;

-- 2) Campaigns table (created earlier only in an unrun migration).
create table if not exists email_campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  subject        text,
  preview_text   text,
  body_html      text,
  status         text default 'draft',      -- draft | scheduled | sending | sent
  segment_id     uuid,                       -- null = all subscribers
  recipient_count integer default 0,
  open_count     integer default 0,
  click_count    integer default 0,
  scheduled_at   timestamptz,
  sent_at        timestamptz,
  kind           text default 'campaign',    -- 'campaign' | 'newsletter'
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
-- In case the table already existed without these:
alter table email_campaigns add column if not exists kind text default 'campaign';
alter table email_campaigns add column if not exists preview_text text;
create index if not exists email_campaigns_kind_idx on email_campaigns(kind, status, sent_at desc);

-- 3) Members: opt-out signals used by the send/unsubscribe path.
alter table members add column if not exists unsubscribed_at timestamptz;
alter table members add column if not exists newsletter_subscribed boolean default true;
