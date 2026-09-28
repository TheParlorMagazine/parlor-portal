-- Submissions v2: alternate byline, opt-in to release as a feed blog post after
-- review, and an excerpt for the feed card. Under review stays PRIVATE (not in
-- the feed) until the review concludes.
-- Run once in Supabase dashboard → Database → SQL Editor.

alter table member_submissions add column if not exists byline        text;
alter table member_submissions add column if not exists share_to_feed boolean not null default true;
alter table member_submissions add column if not exists feed_visible  boolean not null default false;
alter table member_submissions add column if not exists excerpt       text;
