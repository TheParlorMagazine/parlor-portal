-- A square "profile" image for a forum (used on the forums list), separate from
-- the wide cover_image_url banner used on the forum page. Run once in Supabase.
alter table forums add column if not exists avatar_url text;
