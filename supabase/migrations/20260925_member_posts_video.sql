-- Allow member posts to embed a YouTube/Vimeo video (link only — nothing hosted
-- or uploaded in the portal).
-- Run once in Supabase dashboard → Database → SQL Editor.

alter table member_posts add column if not exists video_url text;
