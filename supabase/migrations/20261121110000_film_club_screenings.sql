begin;

create table public.film_club_screenings (
  event_id uuid primary key references public.events(id) on delete cascade,
  forum_id uuid unique references public.forums(id) on delete set null,
  trailer_url text,
  ticket_url text,
  public_tickets integer check (public_tickets >= 0),
  public_gross_cents integer check (public_gross_cents >= 0),
  ticket_reported_at timestamptz,
  ticket_price_cents integer not null default 999 check (ticket_price_cents >= 0),
  host_share_percent numeric(5,2) not null default 45 check (host_share_percent between 0 and 100),
  license_price_cents integer not null default 10000 check (license_price_cents >= 0),
  license_threshold integer not null default 23 check (license_threshold > 0)
);

alter table public.film_club_screenings enable row level security;
revoke all on public.film_club_screenings from public, anon, authenticated;
grant select, insert, update, delete on public.film_club_screenings to service_role;

create function public.create_film_club_screening(
  p_id uuid, p_creator uuid, p_title text, p_starts_at timestamptz,
  p_description text, p_trailer_url text, p_ticket_url text
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_forum_id uuid;
begin
  -- Reserve the event ID first so a repeated submission cannot create another event.
  insert into public.events(id, title, starts_at, description, status, is_public, created_by)
    values (p_id, p_title, p_starts_at, p_description, 'draft', true, p_creator)
    on conflict (id) do nothing;
  if not found then
    if exists (
      select 1 from public.film_club_screenings s join public.events e on e.id = s.event_id
      where s.event_id = p_id and e.created_by = p_creator
    ) then return p_id; end if;
    raise exception 'Event ID already exists';
  end if;

  insert into public.forums(name, description, tied_to_type, tied_to_ref, created_by, member_count, status, join_policy)
    values (p_title || ' — Discussion', 'Film Club screening discussion.', 'event', p_id::text, p_creator, 1, 'archived', 'open')
    returning id into v_forum_id;
  insert into public.forum_members(forum_id, member_id, role)
    values (v_forum_id, p_creator, 'host');
  update public.events set forum_id = v_forum_id where id = p_id;
  insert into public.film_club_screenings(event_id, forum_id, trailer_url, ticket_url)
    values (p_id, v_forum_id, p_trailer_url, p_ticket_url);
  return p_id;
end;
$$;

revoke all on function public.create_film_club_screening(uuid, uuid, text, timestamptz, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_film_club_screening(uuid, uuid, text, timestamptz, text, text, text)
  to service_role;

create function public.sync_film_club_forum_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.forums set status = case when new.status = 'published' then 'active' else 'archived' end
  where id = (select forum_id from public.film_club_screenings where event_id = new.id);
  return new;
end;
$$;

create trigger sync_film_club_forum_status
after update of status on public.events
for each row when (old.status is distinct from new.status)
execute function public.sync_film_club_forum_status();

commit;
