-- Member social profiles — banner + headline (avatar_url and bio already exist).
-- Run once in Supabase dashboard → Database → SQL Editor.

alter table members add column if not exists banner_url text;
alter table members add column if not exists headline   text;   -- LinkedIn-style tagline
