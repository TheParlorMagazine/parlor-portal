-- Phone number for the member portal's Settings → Personal information section.
-- Private contact field (not shown publicly). Run once in Supabase → SQL Editor.
alter table members add column if not exists phone text;
