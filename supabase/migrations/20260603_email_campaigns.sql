-- Run in Supabase dashboard → Database → SQL Editor

-- Campaigns
create table if not exists email_campaigns (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  subject         text        not null default '',
  preview_text    text        default '',
  body_html       text        not null default '',
  status          text        default 'draft',  -- draft | scheduled | sending | sent
  segment_id      uuid,
  recipient_count integer     default 0,
  open_count      integer     default 0,
  click_count     integer     default 0,
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Segments
create table if not exists email_segments (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  description     text,
  filter_type     text,         -- plan | source | behavior | engagement | manual
  filter_config   jsonb       default '{}',
  member_count    integer     default 0,
  last_updated_at timestamptz default now(),
  created_at      timestamptz default now()
);

-- Manual segment members
create table if not exists email_segment_members (
  segment_id      uuid        not null references email_segments(id) on delete cascade,
  member_id       uuid        not null,
  primary key (segment_id, member_id)
);

-- Extend members table
alter table members add column if not exists engagement_score integer default 0;
alter table members add column if not exists unsubscribed_at  timestamptz;
alter table members add column if not exists source           text;
alter table members add column if not exists tags             text[];
