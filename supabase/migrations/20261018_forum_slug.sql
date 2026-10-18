-- Add slug to forums for human-readable URLs
alter table forums add column if not exists slug text unique;

-- Backfill: generate slug from name (lowercase, spaces→hyphens, strip non-alphanum)
update forums
set slug = lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
where slug is null;

create unique index if not exists forums_slug_idx on forums (slug);
