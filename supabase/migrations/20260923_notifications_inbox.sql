-- Member-portal Notifications + Inbox (messaging), migrated from Airtable.
-- Accessed via service-role API routes (like the rest of the native portal), so
-- created without RLS — do NOT expose these to the anon client directly.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  type        text,            -- reply | inbox | library | event | new_thread | system
  message     text not null,
  link_to     text,            -- portal destination: dashboard | forum | library | events | inbox
  link_ref    text,            -- optional id/slug the link points at
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_member_idx on notifications(member_id, read, created_at desc);

create table if not exists inbox_threads (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references members(id) on delete cascade,
  subject              text,
  last_message_preview text,
  last_message_at      timestamptz,
  member_unread        integer not null default 0,   -- unread count from the member's side
  initiated_by         text default 'member',        -- member | admin
  created_at           timestamptz not null default now()
);
create index if not exists inbox_threads_member_idx on inbox_threads(member_id, last_message_at desc);

create table if not exists inbox_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references inbox_threads(id) on delete cascade,
  sender_type text,            -- member | admin | editor
  sender_name text,
  sender_id   text,
  body        text not null,
  read        boolean not null default false,   -- read by the recipient
  created_at  timestamptz not null default now()
);
create index if not exists inbox_messages_thread_idx on inbox_messages(thread_id, created_at);
