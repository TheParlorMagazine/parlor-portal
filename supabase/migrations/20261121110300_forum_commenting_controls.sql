begin;

alter table public.forums add column commenting_open boolean not null default true;
alter table public.forum_threads add column replies_locked boolean not null default false;
alter table public.member_posts add column replies_locked boolean not null default false;

-- Extend the function used by the existing four posting triggers.
create or replace function public.guard_film_club_posting()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_forum uuid;
  v_locked boolean;
  v_open boolean;
  v_status text;
  v_screening public.film_club_screenings%rowtype;
begin
  case tg_table_name
    when 'forum_replies' then
      select forum_id, replies_locked into v_forum, v_locked
      from public.forum_threads where id = new.thread_id for share;
    when 'member_post_comments' then
      select forum_id, replies_locked into v_forum, v_locked
      from public.member_posts where id = new.post_id for share;
    else v_forum := new.forum_id;
  end case;

  if v_locked then
    raise exception 'Replies are locked on this conversation' using errcode = '42501';
  end if;
  if v_forum is null then return new; end if;

  select commenting_open, status into v_open, v_status
  from public.forums where id = v_forum for share;
  select * into v_screening from public.film_club_screenings
    where forum_id = v_forum for share;

  if not v_open or (found and (
    v_screening.discussion_archived or not v_screening.commenting_open or v_status <> 'active'
  )) then
    raise exception 'Commenting is closed in this forum' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- These fields are changed through the authenticated moderation endpoint.
-- Existing service-role access remains intact.
commit;
