-- Groups = discussion forums, now member-discoverable with Facebook-style join
-- policies. Members can propose a group (→ Master Admin approval). A group's
-- moderators (forum_members.role='host') set its join policy and approve requests.
-- Run once in Supabase dashboard → Database → SQL Editor.

-- open = anyone joins instantly · request = moderator approves · paid = paid members only
alter table forums add column if not exists join_policy text not null default 'request';
alter table forums add column if not exists proposed_by uuid references members(id);
-- forums.status now also uses 'pending' (proposed, awaiting Master Admin) and 'declined'.

create table if not exists forum_join_requests (
  id         uuid primary key default gen_random_uuid(),
  forum_id   uuid not null references forums(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  status     text not null default 'pending',   -- pending | approved | declined
  created_at timestamptz not null default now(),
  unique (forum_id, member_id)
);
create index if not exists forum_join_requests_forum_idx on forum_join_requests(forum_id, status);
create index if not exists forum_join_requests_member_idx on forum_join_requests(member_id);
