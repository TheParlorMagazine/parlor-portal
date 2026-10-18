-- Add cover_image_position to articles for controlling object-position on hero images
alter table articles add column if not exists cover_image_position text default null;
