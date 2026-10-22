-- Optional guided tour only: independent of welcome-email delivery and billing.
BEGIN;
create table if not exists public.portal_tour_config (
 id boolean primary key default true check (id), launched_at timestamptz not null default now()
);
-- Preserve the original launch cutoff when rerun; older accounts opt in via help.
insert into public.portal_tour_config(id) values(true) on conflict(id) do nothing;
create table if not exists public.member_portal_tour_state (
 member_id uuid primary key references public.members(id) on delete cascade,
 version integer not null default 1 check(version=1),
 status text not null default 'not_started' check(status in ('not_started','in_progress','postponed','skipped','completed')),
 step integer not null default 0 check(step between 0 and 4),
 updated_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.portal_tour_config enable row level security;
alter table public.member_portal_tour_state enable row level security;
revoke all on public.portal_tour_config,public.member_portal_tour_state from public,anon,authenticated;
grant select on public.portal_tour_config to service_role;
grant select,insert,update on public.member_portal_tour_state to service_role;
COMMIT;
