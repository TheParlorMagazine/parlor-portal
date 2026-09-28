-- Member posts: editorial fields + consent on member_submissions, and
-- member-post lineage + publish gating on articles.
-- Run once in Supabase dashboard → SQL Editor.

alter table member_submissions
  add column if not exists vertical text,               -- chosen vertical (full name)
  add column if not exists bio text,                    -- one-line author bio shown with the piece
  add column if not exists sources text,                -- links/notes for fact-checking (not published)
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists consent_version text;

alter table articles
  add column if not exists media_type text default 'editorial',  -- 'editorial' | 'member_post'
  add column if not exists source_member_post_id uuid references member_submissions(id) on delete set null,
  add column if not exists author_approved_at timestamptz;        -- member's sign-off before a member_post can publish
create index if not exists articles_media_type_idx on articles(media_type);
