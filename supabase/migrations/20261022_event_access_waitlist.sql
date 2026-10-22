-- Apply manually BEFORE deploying the matching application changes.
BEGIN;
alter table public.events add column if not exists is_public boolean not null default false;
update public.events set is_public=false where is_public is null;
alter table public.events alter column is_public set default false;
alter table public.events alter column is_public set not null;
alter table public.event_rsvps add column if not exists queued_at timestamptz;
update public.event_rsvps set queued_at=created_at where status='waitlist' and queued_at is null;
create or replace function public.event_staff(p_event uuid,p_member uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from members where id=p_member and role in ('admin','social_admin')) or
 exists(select 1 from events e where e.id=p_event and (e.created_by=p_member or exists(
 select 1 from forum_members f where f.forum_id=e.forum_id and f.member_id=p_member and f.role='host')));
$$;
create or replace function public.event_visible(p_event uuid,p_member uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from events e where e.id=p_event and e.status='published' and
 (e.is_public or event_staff(e.id,p_member) or exists(select 1 from forum_members f where f.forum_id=e.forum_id and f.member_id=p_member)));
$$;
create or replace view public.event_attendance as
 select r.*,row_number() over(partition by r.event_id,r.status order by r.queued_at nulls last,r.created_at,r.member_id) as queue_position
 from public.event_rsvps r where not public.event_staff(r.event_id,r.member_id);
revoke all on public.event_attendance from public,anon,authenticated;
grant select on public.event_attendance to service_role;
create table if not exists public.event_registration_messages (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references events(id) on delete cascade,
 member_id uuid not null references members(id) on delete cascade,
 kind text not null check(kind in ('going','waitlist','promoted','cancelled','waitlist_reminder','staff_reminder')),
 queue_position integer,created_at timestamptz not null default now(),claimed_at timestamptz,sent_at timestamptz,last_error text);
alter table public.event_registration_messages enable row level security;
revoke all on public.event_registration_messages from public,anon,authenticated;
grant all on public.event_registration_messages to service_role;
create or replace function public.event_summary(p_event uuid,p_member uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare e events;r record;staff boolean;
begin
 select * into e from events where id=p_event;
 if not found or not event_visible(p_event,p_member) then raise exception 'Event not available' using errcode='42501';end if;
 staff:=event_staff(p_event,p_member);
 select * into r from event_attendance where event_id=p_event and member_id=p_member;
 return jsonb_build_object('event',(to_jsonb(e)-'join_url')||jsonb_build_object(
 'join_url',case when staff or r.status='going' then e.join_url else null end,
 'going_count',(select count(*) from event_attendance where event_id=p_event and status='going')),
 'my_status',case when staff then 'host' else r.status end,'queue_position',case when r.status='waitlist' then r.queue_position else null end,
 'can_manage',staff,'can_access_forum',exists(select 1 from forum_members where forum_id=e.forum_id and member_id=p_member)
 or exists(select 1 from members where id=p_member and role in ('admin','social_admin')));
end $$;
create or replace function public.event_registration(p_event uuid,p_actor uuid,p_action text,p_target uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e events;target uuid:=coalesce(p_target,p_actor);previous text;new_status text;seats integer;candidate record;pos integer;
begin
 -- Serialize registrations and promotions on the event row.
 select * into e from events where id=p_event for update;
 if not found then raise exception 'Event not found' using errcode='42501';end if;
 if p_action not in ('join','cancel','promote','remove','reconcile') then raise exception 'Invalid action';end if;
 if (target<>p_actor or p_action in ('promote','remove','reconcile')) and not event_staff(p_event,p_actor)
 then raise exception 'Hosts only' using errcode='42501';end if;
 if p_action in ('join','promote') and coalesce(e.ends_at,e.starts_at,'infinity'::timestamptz)<=now() then raise exception 'Event has ended' using errcode='22023';end if;
 if p_action in ('join','promote') and not event_visible(p_event,target)
 then raise exception 'Event not available' using errcode='42501';end if;
 if event_staff(p_event,target) and p_action<>'reconcile' then return jsonb_build_object('status','host');end if;
 select status into previous from event_rsvps where event_id=p_event and member_id=target;
 if p_action='join' and previous in ('going','waitlist') then return jsonb_build_object('status',previous);end if;
 if p_action in ('cancel','remove') then
 update event_rsvps set status='cancelled',queued_at=null where event_id=p_event and member_id=target;
 if previous in ('going','waitlist') then insert into event_registration_messages(event_id,member_id,kind) values(p_event,target,'cancelled');end if;
 elsif p_action='join' then
 insert into event_rsvps(event_id,member_id,status,queued_at) values(p_event,target,'waitlist',clock_timestamp())
 on conflict(event_id,member_id) do update set status='waitlist',queued_at=clock_timestamp(),reminded_at=null;
 end if;
 seats:=case when e.capacity is null then 2147483647 else greatest(0,e.capacity-(select count(*) from event_attendance where event_id=p_event and status='going')) end;
 if p_action='promote' then
 if previous is distinct from 'waitlist' then raise exception 'Member is not waitlisted';end if;
 if seats<1 then raise exception 'Event is full';end if;
 update event_rsvps set status='going',queued_at=null,reminded_at=null where event_id=p_event and member_id=target;
 insert into event_registration_messages(event_id,member_id,kind) values(p_event,target,'promoted');seats:=seats-1;
 end if;
 if e.status='published' and coalesce(e.ends_at,e.starts_at,'infinity'::timestamptz)>now() then
 for candidate in select a.member_id from event_attendance a where a.event_id=p_event and a.status='waitlist'
 and event_visible(p_event,a.member_id) order by a.queue_position limit seats loop
 update event_rsvps set status='going',queued_at=null,reminded_at=null where event_id=p_event and member_id=candidate.member_id;
 insert into event_registration_messages(event_id,member_id,kind) values(p_event,candidate.member_id,
 case when p_action='join' and candidate.member_id=target then 'going' else 'promoted' end);
 end loop;end if;
 select status into new_status from event_rsvps where event_id=p_event and member_id=target;
 if p_action='join' and new_status='waitlist' then
 select queue_position into pos from event_attendance where event_id=p_event and member_id=target;
 insert into event_registration_messages(event_id,member_id,kind,queue_position) values(p_event,target,'waitlist',pos);end if;
 -- Attendance never grants or revokes forum membership.
 return jsonb_build_object('status',coalesce(new_status,'cancelled'));
end $$;
create or replace function public.claim_event_registration_messages(p_event uuid default null)
returns setof public.event_registration_messages language sql security definer set search_path=public as $$
 update event_registration_messages set claimed_at=now() where id in (
 select id from event_registration_messages where sent_at is null and (claimed_at is null or claimed_at<now()-interval '10 minutes')
 and (p_event is null or event_id=p_event) order by created_at limit 100 for update skip locked) returning *;
$$;
create or replace function public.queue_event_audience_reminders()
returns void language plpgsql security definer set search_path=public as $$
declare event_row record;
begin
 perform pg_advisory_xact_lock(20261022);
 for event_row in select id,created_by from events where status='published' and created_by is not null and coalesce(ends_at,starts_at,'infinity'::timestamptz)>now() loop
 perform event_registration(event_row.id,event_row.created_by,'reconcile');end loop;
 insert into event_registration_messages(event_id,member_id,kind)
 select e.id,m.id,case when event_staff(e.id,m.id) then 'staff_reminder' else 'waitlist_reminder' end
 from events e cross join members m where e.status='published' and e.starts_at between now() and now()+interval '24 hours'
 and (event_staff(e.id,m.id) or exists(select 1 from event_attendance a where a.event_id=e.id and a.member_id=m.id and a.status='waitlist' and event_visible(e.id,m.id)))
 and not exists(select 1 from event_registration_messages n where n.event_id=e.id and n.member_id=m.id and n.kind in ('staff_reminder','waitlist_reminder'));
end $$;
revoke all on function public.event_staff(uuid,uuid),public.event_visible(uuid,uuid),public.event_summary(uuid,uuid),public.event_registration(uuid,uuid,text,uuid),public.claim_event_registration_messages(uuid),public.queue_event_audience_reminders() from public,anon,authenticated;
grant execute on function public.event_staff(uuid,uuid),public.event_visible(uuid,uuid),public.event_summary(uuid,uuid),public.event_registration(uuid,uuid,text,uuid),public.claim_event_registration_messages(uuid),public.queue_event_audience_reminders() to service_role;
alter table public.events enable row level security;
revoke all on public.events from anon,authenticated;
grant all on public.events to service_role;
alter table public.event_rsvps enable row level security;
revoke all on public.event_rsvps from anon,authenticated;
grant all on public.event_rsvps to service_role;
create or replace function public.validate_event_capacity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.capacity is not null and new.capacity<1 then raise exception 'Capacity must be positive' using errcode='22023';end if;
 if new.capacity is not null and new.capacity<(select count(*) from event_attendance where event_id=new.id and status='going')
 then raise exception 'Capacity cannot be below confirmed attendance' using errcode='22023';end if;
 if new.status='published' and not new.is_public and new.forum_id is null then raise exception 'Private events require a forum' using errcode='22023';end if;
 return new;
end $$;
drop trigger if exists validate_event_capacity on public.events;
create trigger validate_event_capacity before insert or update of capacity,is_public,forum_id,status on public.events
 for each row execute function public.validate_event_capacity();
create or replace function public.event_communication_recipients(p_event uuid default null)
returns table(member_id uuid) language sql stable security definer set search_path=public as $$
 select distinct m.id from members m join events e on (p_event is null or e.id=p_event)
 where e.status='published' and event_visible(e.id,m.id) and (event_staff(e.id,m.id) or exists(
 select 1 from event_attendance a where a.event_id=e.id and a.member_id=m.id and a.status='going'));
$$;
revoke all on function public.event_communication_recipients(uuid), public.validate_event_capacity() from public,anon,authenticated;
grant execute on function public.event_communication_recipients(uuid) to service_role;
COMMIT;
