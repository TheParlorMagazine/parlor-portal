-- Events — salons, readings, roundtables. Open for any member to RSVP; RSVPing
-- grants access to the event's tied forum (auto-joined) and kicks off the event
-- email automation (confirmation + reminders). Free RSVP only (no ticketing yet).
-- Service-role API access. Requires 20260923_forums.sql.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists events (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  blurb          text,                  -- short teaser for cards
  description    text,                  -- full details
  cover_image_url text,
  location_type  text default 'virtual',-- virtual | in_person | hybrid
  location       text,                  -- venue / "Zoom" etc.
  join_url       text,                  -- link revealed to attendees
  starts_at      timestamptz,
  ends_at        timestamptz,
  capacity       integer,               -- null = unlimited
  status         text not null default 'draft',  -- draft | published | cancelled
  forum_id       uuid references forums(id) on delete set null,  -- tied discussion room
  host_name      text,
  created_by     uuid references members(id),
  created_at     timestamptz not null default now()
);
create index if not exists events_status_idx on events(status, starts_at);

create table if not exists event_rsvps (
  event_id     uuid not null references events(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  status       text not null default 'going',   -- going | waitlist | cancelled
  reminded_at  timestamptz,            -- last reminder sent (dedupe)
  created_at   timestamptz not null default now(),
  primary key (event_id, member_id)
);
create index if not exists event_rsvps_member_idx on event_rsvps(member_id);
create index if not exists event_rsvps_event_idx on event_rsvps(event_id, status);
