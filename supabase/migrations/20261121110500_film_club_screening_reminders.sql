begin;

create table public.film_club_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.film_club_screenings(event_id) on delete cascade,
  email text not null,
  claimed_at timestamptz not null,
  sent_at timestamptz,
  unique (event_id, email)
);
alter table public.film_club_reminder_deliveries enable row level security;
revoke all on public.film_club_reminder_deliveries from public, anon, authenticated;
grant select, insert, update on public.film_club_reminder_deliveries to service_role;

create function public.claim_film_club_reminder_emails()
returns table(id uuid, email text, title text, starts_at timestamptz)
language sql set search_path = '' as $$
  with eligible as materialized (
    select e.id, e.title, e.starts_at
    from public.events e join public.film_club_screenings s on s.event_id = e.id
    where e.status = 'published' and e.starts_at > now()
      and e.starts_at <= now() + interval '24 hours'
  ), audience as (
    select b.event_id, b.email from public.film_club_ticket_buyers b
    join eligible e on e.id = b.event_id
    union
    select r.event_id, lower(trim(m.email))
    from public.event_attendance r join eligible e on e.id = r.event_id
    join public.members m on m.id = r.member_id
    where r.status = 'going' and nullif(trim(m.email), '') is not null
  ), pending as (
    select a.event_id, a.email from audience a
    join eligible e on e.id = a.event_id
    left join public.film_club_reminder_deliveries d
      on d.event_id = a.event_id and d.email = a.email
    where d.sent_at is null and (d.claimed_at is null or d.claimed_at < now() - interval '30 minutes')
    order by e.starts_at, d.claimed_at nulls first, a.event_id, a.email
    limit 100
  ), claimed as (
    insert into public.film_club_reminder_deliveries as d(event_id, email, claimed_at)
      select p.event_id, p.email, now() from pending p
    on conflict (event_id, email) do update set claimed_at = excluded.claimed_at
      where d.sent_at is null and d.claimed_at < now() - interval '30 minutes'
    returning d.id, d.event_id, d.email
  )
  select c.id, c.email, e.title, e.starts_at from claimed c join eligible e on e.id = c.event_id;
$$;

revoke all on function public.claim_film_club_reminder_emails() from public, anon, authenticated;
grant execute on function public.claim_film_club_reminder_emails() to service_role;
commit;
