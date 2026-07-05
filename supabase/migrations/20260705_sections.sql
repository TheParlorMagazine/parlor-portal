-- Adds issue-scoped "sections" (e.g. "The Borders of the Body" within the
-- Borderlands of Identity issue), each with its own title/subtitle/illustration.
-- Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  title text not null,
  slug text not null,
  subtitle text,
  illustration_url text,
  position integer,
  created_at timestamptz not null default now(),
  unique (issue_id, slug)
);

create index if not exists sections_issue_id_idx on sections(issue_id);

alter table articles
  add column if not exists section_id uuid references sections(id) on delete set null;

create index if not exists articles_section_id_idx on articles(section_id);

-- NOTE: this table is created without RLS policies, matching the assumption
-- that access mirrors the existing `issues` table. If `issues` has RLS
-- enabled with specific policies, mirror those here before relying on this
-- in production — otherwise `sections` will be open to any client with the
-- anon key.
