-- Member posts — "Share with The Parlor" wall. Text + optional image + optional
-- link with a preview thumbnail. Shown on the author's profile and in the
-- dashboard community feed. Service-role API access.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists member_posts (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references members(id) on delete cascade,
  body              text,
  image_url         text,
  link_url          text,
  link_title        text,
  link_description  text,
  link_image        text,
  status            text not null default 'live',   -- live | removed
  report_count      integer not null default 0,
  removed_at        timestamptz,
  removed_by        uuid references members(id),
  created_at        timestamptz not null default now()
);
create index if not exists member_posts_member_idx on member_posts(member_id, created_at desc);
create index if not exists member_posts_feed_idx on member_posts(status, created_at desc);
