-- Member-portal Library, unified INTO the existing `articles` table.
-- The Library in Airtable ("Parlor Mag" base) is the same content set as the
-- public articles: 52 of 61 Library items already exist as articles (matched by
-- slug/title). So instead of a parallel table, we:
--   * add the few Library-only columns `articles` lacks (below);
--   * enrich the 52 existing rows with theme / discussion prompt / editor note
--     (never overwriting their live title/body/cover);
--   * insert the 9 Library-exclusive items as articles flagged in_library=true
--     and published=false (they power the member Library, never public routes).
-- The small library_themes table keeps the 13 themes' copy + ordering used to
-- group the member Library page.
-- Run once in Supabase dashboard → Database → SQL Editor.

-- 1. Library-only columns on articles (all additive / nullable).
alter table articles add column if not exists theme             text;
alter table articles add column if not exists discussion_prompt text;
alter table articles add column if not exists editor_note       text;
alter table articles add column if not exists thumbnail_style   text;  -- essay|book|poster|audio|film
alter table articles add column if not exists is_new            boolean not null default false;
alter table articles add column if not exists in_library        boolean not null default false;

create index if not exists articles_theme_idx      on articles(theme);
create index if not exists articles_in_library_idx on articles(in_library);

-- 2. Theme lookup (descriptions, forum CTA, section ordering for the Library page).
create table if not exists library_themes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  slug           text unique,
  description    text,
  forum_cta_text text,
  sort_order     integer,
  created_at     timestamptz not null default now()
);

-- Themes are non-sensitive labels; allow public read so the browser client
-- (article editor Theme dropdown, vertical pages) can list them, matching the
-- read access the other reference tables already have.
grant select on library_themes to anon, authenticated;
alter table library_themes enable row level security;
drop policy if exists library_themes_read on library_themes;
create policy library_themes_read on library_themes for select using (true);
