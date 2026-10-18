-- Fix: sections write policy was granted to all authenticated users.
-- Only admins and editors should be able to create/edit/delete sections.
-- Reads stay public (needed for the public article pages).
--
-- Rollback: re-run the policy from 20260705b_sections_rls.sql
--   create policy "Authenticated users can manage sections" on sections
--     for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage sections" on sections;

create policy "Admins and editors can manage sections"
  on sections
  for all
  to authenticated
  using   (is_admin() or exists (select 1 from members where id = auth.uid() and role in ('admin','editor')))
  with check (is_admin() or exists (select 1 from members where id = auth.uid() and role in ('admin','editor')));

-- Verification query (run after applying):
-- select auth.uid(), is_admin(); -- as a non-admin member should return false
-- insert into sections (issue_id, title, slug) values ('any-uuid','test','test'); -- should fail for non-admins
