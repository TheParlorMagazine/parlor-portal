-- Include paid Parlor ticket purchasers alongside imported screening contacts.
-- Preserve the existing claim ID, retry window and one-delivery-per-email constraint.
begin;

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
    select t.event_id, lower(trim(m.email))
    from public.film_club_tickets t
    join eligible e on e.event_id = t.event_id
    join public.members m on m.id = t.member_id
    where t.payment_status in ('paid', 'partially_refunded')
      and nullif(trim(m.email), '') is not null
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
