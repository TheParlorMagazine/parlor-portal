-- Article comments — subscriber-only posting, public reading.
-- Flat + one level of replies (parent_id points at a top-level comment only).
-- Accessed via service-role API routes; reading is public through a GET route
-- that returns only status='live' rows, so no RLS is needed here.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists article_comments (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references articles(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  parent_id     uuid references article_comments(id) on delete cascade,  -- null = top-level; set = reply
  body          text not null,
  status        text not null default 'live',   -- live | removed
  report_count  integer not null default 0,
  edited_at     timestamptz,
  removed_at    timestamptz,
  removed_by    uuid references members(id),
  created_at    timestamptz not null default now()
);
create index if not exists article_comments_article_idx on article_comments(article_id, created_at);
create index if not exists article_comments_parent_idx  on article_comments(parent_id, created_at);
create index if not exists article_comments_member_idx  on article_comments(member_id, created_at desc);
-- Moderation queue lookup: live comments that have been reported.
create index if not exists article_comments_reported_idx on article_comments(report_count desc, created_at desc)
  where status = 'live' and report_count > 0;

-- One report per member per comment (the unique constraint blocks double-flagging).
create table if not exists comment_reports (
  id          uuid primary key default gen_random_uuid(),
  comment_id  uuid not null references article_comments(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (comment_id, member_id)
);
create index if not exists comment_reports_comment_idx on comment_reports(comment_id, created_at desc);
