begin;
-- One transaction publishes the screening and opens sales only for the synced version.
-- Uses the same lock as settings, checkout reservations, and pricing synchronization.
create function public.publish_film_ticket_sales(p_event uuid,p_actor uuid,p_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare s public.film_club_screenings; e public.events;
begin
 perform pg_advisory_xact_lock(72625190001);
 select * into s from public.film_club_screenings where event_id=p_event for update;
 if not found or s.pricing_version is distinct from p_version
  or s.stripe_synced_version is distinct from p_version or s.stripe_archived then
  raise exception 'Ticket pricing changed; save current settings before publishing';
 end if;
 select * into e from public.events where id=p_event for update;
 if not found or e.starts_at<=now() or e.ends_at is null or e.ends_at<=e.starts_at then
  raise exception 'A future start and valid event end are required';
 end if;
 update public.events set status='published',is_public=true where id=p_event;
 perform public.set_film_ticket_sales(p_event,p_actor,true);
 insert into public.film_club_ticket_audit(event_id,actor_id,action,detail)
 values(p_event,p_actor,'published_and_sales_opened',jsonb_build_object('version',p_version));
end $$;
revoke all on function public.publish_film_ticket_sales(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.publish_film_ticket_sales(uuid,uuid,integer) to service_role;
commit;
