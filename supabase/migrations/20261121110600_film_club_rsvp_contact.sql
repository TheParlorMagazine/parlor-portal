begin;

alter table public.event_rsvps
  add column film_club_rsvp_name text,
  add column film_club_rsvp_email text;

-- Keep the contact details and RSVP in the same transaction as seat assignment.
create function public.register_film_club_rsvp(p_event uuid, p_actor uuid, p_name text, p_email text)
returns jsonb language plpgsql set search_path = '' as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.film_club_screenings where event_id = p_event)
    or not coalesce(public.film_club_paid_member(p_actor), false) then
    raise exception 'Complimentary RSVPs are available to paid members' using errcode = '42501';
  end if;

  if p_name is null or char_length(trim(p_name)) not between 1 and 160
    or p_email is null or char_length(trim(p_email)) > 254
    or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter your name and a valid email address.' using errcode = '22023';
  end if;

  result := public.event_registration(p_event, p_actor, 'join');
  if result->>'status' in ('going', 'waitlist') then
    update public.event_rsvps
      set film_club_rsvp_name = trim(p_name), film_club_rsvp_email = lower(trim(p_email))
      where event_id = p_event and member_id = p_actor;
  end if;
  return result;
end;
$$;

revoke all on function public.register_film_club_rsvp(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.register_film_club_rsvp(uuid, uuid, text, text) to service_role;

create or replace function public.claim_film_club_reminder_emails()
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
    select r.event_id, coalesce(r.film_club_rsvp_email, nullif(lower(trim(m.email)), ''))
    from public.event_rsvps r join eligible e on e.id = r.event_id
    join public.members m on m.id = r.member_id
    where r.status = 'going' and not public.event_staff(r.event_id, r.member_id)
      and coalesce(r.film_club_rsvp_email, nullif(lower(trim(m.email)), '')) is not null
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

create or replace function public.claim_film_club_discussion_emails()
returns table(id uuid, event_id uuid, email text, title text, forum_id uuid)
language plpgsql set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(20261121110400);
  return query
  with eligible as materialized (
    select s.event_id, e.title, s.forum_id
    from public.film_club_screenings s
    join public.events e on e.id = s.event_id
    join public.forums f on f.id = s.forum_id
    where s.discussion_email_enabled and e.status = 'published'
      and e.ends_at <= now()
      and f.status = 'active' and f.join_policy = 'open'
      and not s.discussion_archived and s.commenting_open and f.commenting_open
  ), audience as materialized (
    select b.event_id, b.email from public.film_club_ticket_buyers b
    join eligible e on e.event_id = b.event_id
    where exists (select 1 from public.members m where lower(trim(m.email)) = b.email)
    union
    select r.event_id, coalesce(r.film_club_rsvp_email, nullif(lower(trim(m.email)), ''))
    from public.event_rsvps r
    join eligible e on e.event_id = r.event_id
    join public.members m on m.id = r.member_id
    where r.status = 'going' and not public.event_staff(r.event_id, r.member_id)
      and coalesce(r.film_club_rsvp_email, nullif(lower(trim(m.email)), '')) is not null
      and r.film_club_paid_at_rsvp
  ), pending as (
    select a.event_id, a.email from audience a
    left join public.film_club_discussion_deliveries d on d.event_id = a.event_id and d.email = a.email
    where d.sent_at is null and (d.claimed_at is null or d.claimed_at < now() - interval '30 minutes')
    order by d.claimed_at nulls first, a.event_id, a.email
    limit 25
  ), claimed as (
    insert into public.film_club_discussion_deliveries as d(event_id, email, claimed_at)
      select p.event_id, p.email, now() from pending p
    on conflict on constraint film_club_discussion_deliveries_event_id_email_key
      do update set claimed_at = excluded.claimed_at
      where d.sent_at is null and d.claimed_at < now() - interval '30 minutes'
    returning d.id, d.event_id, d.email
  )
  select c.id, c.event_id, c.email, e.title, e.forum_id
  from claimed c join eligible e on e.event_id = c.event_id;
end;
$$;

commit;
