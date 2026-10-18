create table if not exists article_comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references article_comments(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(comment_id, member_id)
);
create index if not exists acl_comment_idx on article_comment_likes(comment_id);
create index if not exists acl_member_idx  on article_comment_likes(member_id);
