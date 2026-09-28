-- Reusable member segments (audiences). A segment is a named group of members,
-- usable to gate forums AND to target broadcasts/campaigns.
--   • filter_type = 'manual'  → membership is the rows in email_segment_members
--   • filter_type = 'plan' | 'behavior' | 'engagement' | 'source' → computed live
-- Managed through service-role API routes (/api/admin/segments*), so no RLS.
-- (These two tables were defined in 20260603_email_campaigns.sql but never run;
--  this focused migration deploys just what segments + forums need.)
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists email_segments (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  description     text,
  filter_type     text        default 'manual',   -- manual | plan | source | behavior | engagement
  filter_config   jsonb       default '{}',
  member_count    integer     default 0,
  created_by      uuid        references members(id),
  last_updated_at timestamptz default now(),
  created_at      timestamptz default now()
);

create table if not exists email_segment_members (
  segment_id  uuid not null references email_segments(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (segment_id, member_id)
);
create index if not exists email_segment_members_member_idx on email_segment_members(member_id);

-- Let broadcasts target a saved custom segment (not just computed audiences).
alter table if exists inbox_broadcasts add column if not exists segment_id uuid references email_segments(id) on delete set null;
