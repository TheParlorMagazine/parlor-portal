-- Forum thumbnail/cover image (used on forum cards). Event-created forums
-- inherit the event's cover unless overridden. Run once in Supabase → SQL Editor.
alter table forums add column if not exists cover_image_url text;
