-- READ ONLY. Run before applying the ticket migration; share schema results, not personal data.
select to_regclass('public.film_club_tickets') as existing_ticket_table,
       to_regclass('public.film_club_stripe_operations') as existing_sync_table,
       to_regprocedure('public.finish_film_price_sync(uuid,integer,text,text)') as existing_sync_function;
select table_name,column_name,data_type,is_nullable
from information_schema.columns where table_schema='public' and table_name in
('film_club_screenings','checkout_reservations','orders','order_items','shop_products','members','events','event_rsvps')
order by table_name,ordinal_position;
select conrelid::regclass as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in ('public.checkout_reservations'::regclass,'public.events'::regclass,'public.orders'::regclass);
select count(*) as confirmed_film_club_rsvps
from public.event_rsvps r join public.film_club_screenings s on s.event_id=r.event_id where r.status='going';
select schemaname,tablename,policyname,roles,cmd from pg_policies
where schemaname='public' and tablename in ('orders','order_items','shop_products','film_club_screenings');
