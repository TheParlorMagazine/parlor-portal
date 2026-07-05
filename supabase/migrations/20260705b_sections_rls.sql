-- Fixes "new row violates row-level security policy for table sections":
-- the sections table has RLS enabled with no policies, blocking all access.
-- Mirrors the pattern used elsewhere in this app: public/anon can read,
-- only authenticated users (i.e. logged-in admins) can write.
-- Run once in Supabase dashboard → Database → SQL Editor.

alter table sections enable row level security;

drop policy if exists "Public read access for sections" on sections;
create policy "Public read access for sections"
  on sections for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can manage sections" on sections;
create policy "Authenticated users can manage sections"
  on sections for all
  to authenticated
  using (true)
  with check (true);
