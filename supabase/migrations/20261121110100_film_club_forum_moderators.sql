begin;

create table public.film_club_forum_moderators (
  forum_id uuid not null references public.forums(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  invited_by uuid references public.members(id) on delete set null,
  expires_at timestamptz not null,
  primary key (forum_id, member_id)
);

alter table public.film_club_forum_moderators enable row level security;
revoke all on public.film_club_forum_moderators from public, anon, authenticated;
grant select, insert, update, delete on public.film_club_forum_moderators to service_role;

create function public.moderate_film_club_discussion(
  p_forum uuid, p_actor uuid, p_thread uuid, p_reply uuid, p_action text
) returns boolean language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.film_club_screenings where forum_id = p_forum)
    or not (
      exists (select 1 from public.members where id = p_actor and role in ('admin', 'editor'))
      or exists (select 1 from public.film_club_forum_moderators
        where forum_id = p_forum and member_id = p_actor and expires_at > statement_timestamp())
    )
    or p_action not in ('pin', 'unpin', 'hide', 'restore') then return false;
  end if;

  perform 1 from public.forum_threads where id = p_thread and forum_id = p_forum for update;
  if not found then return false; end if;

  if p_reply is not null then
    if p_action not in ('hide', 'restore') then return false; end if;
    update public.forum_replies set
      status = case when p_action = 'hide' then 'removed' else 'live' end,
      removed_at = case when p_action = 'hide' then now() end,
      removed_by = case when p_action = 'hide' then p_actor end
    where id = p_reply and thread_id = p_thread;
    if not found then return false; end if;
    update public.forum_threads set reply_count = (
      select count(*) from public.forum_replies where thread_id = p_thread and status = 'live'
    ) where id = p_thread;
  elsif p_action in ('pin', 'unpin') then
    update public.forum_threads set pinned = p_action = 'pin' where id = p_thread;
  else
    update public.forum_threads set
      status = case when p_action = 'hide' then 'removed' else 'live' end,
      removed_at = case when p_action = 'hide' then now() end,
      removed_by = case when p_action = 'hide' then p_actor end
    where id = p_thread;
    update public.forums set thread_count = (
      select count(*) from public.forum_threads where forum_id = p_forum and status = 'live'
    ) where id = p_forum;
  end if;
  return true;
end;
$$;

revoke all on function public.moderate_film_club_discussion(uuid, uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.moderate_film_club_discussion(uuid, uuid, uuid, uuid, text)
  to service_role;

commit;
