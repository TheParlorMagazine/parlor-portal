begin;

alter table public.film_club_screenings
  add column discussion_email_enabled boolean not null default false;

alter table public.event_rsvps
  add column film_club_paid_at_rsvp boolean not null default false;

create function public.film_club_paid_member(p_member uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.members m where m.id = p_member
      and m.plan ~* 'reader|printing|circle|press|print'
      and lower(coalesce(m.subscription_status::text, '')) not in
        ('churned','cancelled','canceled','expired','unpaid','incomplete_expired')
  );
$$;

revoke all on function public.film_club_paid_member(uuid) from public, anon, authenticated;
grant execute on function public.film_club_paid_member(uuid) to service_role;

-- Capture paid status when an RSVP is made so later billing changes do not
-- alter the audience. A cancelled RSVP is excluded by its current RSVP status.
create function public.capture_film_club_paid_rsvp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('going', 'waitlist')
    and (tg_op = 'INSERT' or old.status not in ('going', 'waitlist')) then
    if exists (select 1 from public.film_club_screenings s where s.event_id = new.event_id) then
      new.film_club_paid_at_rsvp := public.film_club_paid_member(new.member_id);
      if not new.film_club_paid_at_rsvp then
        raise exception 'Complimentary Film Club RSVPs are available to paid members.' using errcode = '22023';
      end if;
    end if;
  end if;
  return new;
end;
$$;

update public.event_rsvps r set film_club_paid_at_rsvp = public.film_club_paid_member(r.member_id)
where r.status in ('going', 'waitlist') and exists (
  select 1 from public.film_club_screenings s where s.event_id = r.event_id
);

create trigger capture_film_club_paid_rsvp
before insert or update of status on public.event_rsvps
for each row execute function public.capture_film_club_paid_rsvp();

create table public.film_club_ticket_buyers (
  event_id uuid not null references public.film_club_screenings(event_id) on delete cascade,
  email text not null,
  primary key (event_id, email),
  check (email = lower(trim(email)) and length(email) between 3 and 254)
);

create table public.film_club_discussion_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.film_club_screenings(event_id) on delete cascade,
  email text not null,
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (event_id, email)
);

alter table public.film_club_ticket_buyers enable row level security;
alter table public.film_club_discussion_deliveries enable row level security;
revoke all on public.film_club_ticket_buyers, public.film_club_discussion_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.film_club_ticket_buyers, public.film_club_discussion_deliveries to service_role;

create function public.replace_film_club_ticket_buyers(p_event uuid, p_emails text[])
returns integer language plpgsql set search_path = '' as $$
declare v_count integer;
begin
  perform 1 from public.film_club_screenings where event_id = p_event for update;
  if not found then raise exception 'Screening not found' using errcode = '22023'; end if;
  delete from public.film_club_ticket_buyers where event_id = p_event;
  insert into public.film_club_ticket_buyers(event_id, email)
    select distinct p_event, lower(trim(value)) from unnest(p_emails) as input(value);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Union the two audiences before claiming. Retain successful deliveries so a
-- reimport, an overlapping RSVP, or a repeated cron run cannot resend them.
create function public.claim_film_club_discussion_emails()
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
    select r.event_id, lower(trim(m.email))
    from public.event_rsvps r
    join eligible e on e.event_id = r.event_id
    join public.members m on m.id = r.member_id
    where r.status = 'going' and nullif(trim(m.email), '') is not null
      and r.film_club_paid_at_rsvp and not public.event_staff(r.event_id, r.member_id)
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

revoke all on function public.replace_film_club_ticket_buyers(uuid, text[]),
  public.claim_film_club_discussion_emails() from public, anon, authenticated;
grant execute on function public.replace_film_club_ticket_buyers(uuid, text[]),
  public.claim_film_club_discussion_emails() to service_role;

commit;
