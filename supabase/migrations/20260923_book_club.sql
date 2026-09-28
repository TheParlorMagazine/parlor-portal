-- Reading Room = the Parlor book club. Curated book selections, each with a link
-- to the book and editor-posted discussion prompts that paid members reply to
-- (threaded, with upvotes). Prompts are authored only by admins/editors; replies
-- by any paid member. Service-role API access.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists book_club (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  author         text,
  cover_image_url text,
  book_url       text,        -- where to buy / read the book
  blurb          text,        -- why we chose it / description
  status         text not null default 'upcoming',  -- current | upcoming | past
  meeting_at     timestamptz, -- optional club discussion date
  sort           integer not null default 0,
  created_by     uuid references members(id),
  created_at     timestamptz not null default now()
);
create index if not exists book_club_status_idx on book_club(status, sort, created_at desc);

create table if not exists book_prompts (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references book_club(id) on delete cascade,
  member_id         uuid not null references members(id) on delete cascade,  -- editor author
  title             text not null,
  body              text,
  status            text not null default 'live',
  pinned            boolean not null default false,
  reply_count       integer not null default 0,
  upvote_count      integer not null default 0,
  report_count      integer not null default 0,
  last_activity_at  timestamptz not null default now(),
  removed_at        timestamptz,
  removed_by        uuid references members(id),
  created_at        timestamptz not null default now()
);
create index if not exists book_prompts_book_idx on book_prompts(book_id, pinned desc, last_activity_at desc);

create table if not exists book_prompt_replies (
  id           uuid primary key default gen_random_uuid(),
  prompt_id    uuid not null references book_prompts(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  body         text not null,
  status       text not null default 'live',
  report_count integer not null default 0,
  removed_at   timestamptz,
  removed_by   uuid references members(id),
  created_at   timestamptz not null default now()
);
create index if not exists book_prompt_replies_prompt_idx on book_prompt_replies(prompt_id, created_at);

create table if not exists book_prompt_votes (
  prompt_id  uuid not null references book_prompts(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prompt_id, member_id)
);
