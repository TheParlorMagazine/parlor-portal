-- Forums — private, invite-gated discussion rooms tied to an event/article/segment.
-- A forum's audience comes from a segment (email_segments); its members are
-- snapshotted into forum_members so admins can then tweak individuals.
-- Room → threads → replies, with per-thread upvotes. Service-role API access.
-- Run once in Supabase dashboard → Database → SQL Editor.
-- Requires 20260923_segments.sql first.

create table if not exists forums (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  guidelines     text,                    -- shown in the thread guidelines box
  tied_to_type   text default 'segment',  -- event | article | segment | standalone
  tied_to_ref    text,                    -- article slug / event id (informational)
  segment_id     uuid references email_segments(id) on delete set null,
  status         text not null default 'active',   -- active | archived
  thread_count   integer not null default 0,
  member_count   integer not null default 0,
  created_by     uuid references members(id),
  created_at     timestamptz not null default now()
);
create index if not exists forums_status_idx on forums(status, created_at desc);

create table if not exists forum_members (
  forum_id   uuid not null references forums(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  role       text not null default 'member',   -- member | host
  added_at   timestamptz not null default now(),
  primary key (forum_id, member_id)
);
create index if not exists forum_members_member_idx on forum_members(member_id);

create table if not exists forum_threads (
  id                uuid primary key default gen_random_uuid(),
  forum_id          uuid not null references forums(id) on delete cascade,
  member_id         uuid not null references members(id) on delete cascade,
  title             text not null,
  body              text,
  status            text not null default 'live',   -- live | removed
  pinned            boolean not null default false,
  reply_count       integer not null default 0,
  upvote_count      integer not null default 0,
  report_count      integer not null default 0,
  last_activity_at  timestamptz not null default now(),
  removed_at        timestamptz,
  removed_by        uuid references members(id),
  created_at        timestamptz not null default now()
);
create index if not exists forum_threads_forum_idx on forum_threads(forum_id, pinned desc, last_activity_at desc);

create table if not exists forum_replies (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references forum_threads(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  body         text not null,
  status       text not null default 'live',
  report_count integer not null default 0,
  removed_at   timestamptz,
  removed_by   uuid references members(id),
  created_at   timestamptz not null default now()
);
create index if not exists forum_replies_thread_idx on forum_replies(thread_id, created_at);

create table if not exists forum_thread_votes (
  thread_id  uuid not null references forum_threads(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, member_id)
);
