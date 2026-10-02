-- Forum feeds reuse member_posts (rich posts with photo/video/link), scoped to a
-- forum. A null forum_id = a personal profile-wall / community post. Run once.
alter table member_posts add column if not exists forum_id uuid references forums(id) on delete cascade;
create index if not exists member_posts_forum_id_idx on member_posts(forum_id);

-- Comments on posts (used by forum feeds; also available to profile walls).
create table if not exists member_post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references member_posts(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  body        text not null,
  status      text not null default 'live',
  created_at  timestamptz not null default now()
);
create index if not exists member_post_comments_post_id_idx on member_post_comments(post_id, created_at);
