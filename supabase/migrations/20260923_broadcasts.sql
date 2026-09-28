-- Named inbox broadcasts (admin → members' portal inboxes), sendable now,
-- scheduled for a time, or (later) triggered by an event.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists inbox_broadcasts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  segment       text not null,              -- all | readers_circle | printing_press | event_attendees
  subject       text,
  body          text not null,
  schedule_type text not null default 'now',-- now | scheduled | event
  scheduled_at  timestamptz,                -- when schedule_type = 'scheduled'
  event_ref     text,                       -- future: event id when schedule_type = 'event'
  status        text not null default 'sent',-- draft | scheduled | sent
  sent_count    integer not null default 0,
  created_by    uuid references members(id) on delete set null,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index if not exists inbox_broadcasts_status_idx on inbox_broadcasts(status, scheduled_at);
