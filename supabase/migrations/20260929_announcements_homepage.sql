-- Extend announcements to also power a large homepage banner (eyebrow + header +
-- description + hero image), in addition to the rotating bottom ribbon.
-- `placement`: 'ribbon' (default, existing behaviour) | 'homepage'.
-- Run once in Supabase dashboard → SQL Editor.
alter table announcements add column if not exists image_url text;
alter table announcements add column if not exists placement text not null default 'ribbon';
create index if not exists announcements_placement_idx on announcements(placement, active, sort);
