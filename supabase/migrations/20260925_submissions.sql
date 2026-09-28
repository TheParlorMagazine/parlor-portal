-- Member article submissions — "Write for The Parlor". Members draft, submit for
-- editorial review; editors approve → published as a Community-labeled article
-- (also shown on the member's profile) or reject with a note.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists member_submissions (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references members(id) on delete cascade,
  title                text not null,
  subtitle             text,
  body                 text,             -- plain text (paragraphs on blank lines)
  cover_image_url      text,
  status               text not null default 'draft',  -- draft | submitted | approved | rejected | published
  editor_note          text,             -- feedback shown to the author
  reviewed_by          uuid references members(id),
  reviewed_at          timestamptz,
  published_article_id uuid references articles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists member_submissions_member_idx on member_submissions(member_id, updated_at desc);
create index if not exists member_submissions_status_idx on member_submissions(status, created_at desc);

-- Flag articles that came from a member submission, for the "Community" label and
-- the newsletter "From the community…" section.
alter table articles add column if not exists is_community boolean not null default false;
alter table articles add column if not exists community_author_id uuid references members(id);
