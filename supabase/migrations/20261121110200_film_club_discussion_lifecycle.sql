begin;

alter table public.film_club_screenings
  add column discussion_active boolean not null default true,
  add column commenting_open boolean not null default true,
  add column discussion_archived boolean not null default false;

-- Serialize new messages against lifecycle updates to the same discussion.
create function public.guard_film_club_posting()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_forum uuid;
  v_screening public.film_club_screenings%rowtype;
begin
  case tg_table_name
    when 'forum_replies' then
      select forum_id into v_forum from public.forum_threads where id = new.thread_id;
    when 'member_post_comments' then
      select forum_id into v_forum from public.member_posts where id = new.post_id;
    else v_forum := new.forum_id;
  end case;
  if v_forum is null then return new; end if;

  select * into v_screening from public.film_club_screenings
    where forum_id = v_forum for share;
  if found and (
    v_screening.discussion_archived or not v_screening.commenting_open
    or not exists (select 1 from public.forums where id = v_forum and status = 'active')
  ) then
    raise exception 'This Film Club discussion is closed to posting' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- These tables are written through the portal's service-role endpoints.
create trigger guard_film_club_posting before insert on public.forum_threads
for each row execute function public.guard_film_club_posting();
create trigger guard_film_club_posting before insert on public.forum_replies
for each row execute function public.guard_film_club_posting();
create trigger guard_film_club_posting before insert on public.member_posts
for each row execute function public.guard_film_club_posting();
create trigger guard_film_club_posting before insert on public.member_post_comments
for each row execute function public.guard_film_club_posting();

commit;
