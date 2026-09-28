-- Forum invites — moderators invite people by email. If the email already
-- belongs to a member they're added directly; otherwise an invite is emailed
-- with a join link they redeem after signing up.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists forum_invites (
  id           uuid primary key default gen_random_uuid(),
  forum_id     uuid not null references forums(id) on delete cascade,
  email        text not null,
  token        text not null unique,
  invited_by   uuid references members(id),
  status       text not null default 'pending',   -- pending | accepted | revoked
  accepted_by  uuid references members(id),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);
create index if not exists forum_invites_forum_idx on forum_invites(forum_id, status);
create index if not exists forum_invites_email_idx on forum_invites(lower(email));
