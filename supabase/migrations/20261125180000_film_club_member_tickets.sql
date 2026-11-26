begin;
-- Additive ticket model; existing RSVPs are retained and never converted/deleted.
alter table public.film_club_screenings
 add column currency text not null default 'usd' check(currency in ('usd','eur','gbp','cad','aud','jpy')),
 add column member_discount_percent numeric(5,2) not null default 20 check(member_discount_percent between 0 and 100),
 add column member_price_override_cents integer check(member_price_override_cents>0),
 add column member_ticket_limit integer check(member_ticket_limit>0),
 add column acquisition_cost_cents integer check(acquisition_cost_cents>=0),
 add column host_share_eligibility text not null default 'unknown' check(host_share_eligibility in ('unknown','yes','no')),
 add column sales_enabled boolean not null default false,
 add column sales_deadline timestamptz,
 add column viewing_start timestamptz,
 add column viewing_end timestamptz,
 add column provider_authorized boolean not null default false,
 add column ticket_settings jsonb not null default '{}'::jsonb,
 add column pricing_version integer not null default 1,
 add column stripe_synced_version integer,
 add column shop_product_id uuid references public.shop_products(id),
 add column stripe_product_id text unique,
 add column stripe_price_id text unique,
 add column stripe_synced_at timestamptz,
 add column stripe_archived boolean not null default false;
alter table public.shop_products add column product_type text not null default 'merchandise', add column stripe_product_id text, add column public_listing boolean not null default true;
drop policy if exists "shop_products public read" on public.shop_products;
create policy "shop_products public read" on public.shop_products for select using(active and (product_type<>'film_screening_ticket' or public_listing));

create table public.film_club_tickets (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.film_club_screenings(event_id),
 member_id uuid not null references public.members(id), order_id uuid not null unique references public.orders(id),
 reservation_id uuid not null unique references public.checkout_reservations(id),
 purchase_email_status text not null default 'not_sent',
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','refunded','partially_refunded','disputed')),
 fulfillment_status text not null default 'awaiting_access' check(fulfillment_status in ('awaiting_access','external_ticket_purchased','private_license_selected','access_assigned','access_sent','cancelled','expired','failed')),
 amount_cents integer not null check(amount_cents>0), refunded_cents integer not null default 0 check(refunded_cents>=0 and refunded_cents<=amount_cents),
 currency text not null, eligibility jsonb not null, stripe_price_id text not null,
 purchased_at timestamptz not null default now(), fulfillment_notes text, viewing_url text, instructions text,
 access_version integer not null default 0, access_email_status text not null default 'not_sent', access_expires_at timestamptz,
 stripe_processing_fee_cents integer, updated_at timestamptz not null default now()
);
create unique index film_club_ticket_active_member on public.film_club_tickets(event_id,member_id) where payment_status not in ('refunded','failed');
create table public.film_club_ticket_audit (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.film_club_screenings(event_id),
 ticket_id uuid references public.film_club_tickets(id), actor_id uuid references public.members(id), action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.film_club_stripe_operations (
 event_id uuid not null references public.film_club_screenings(event_id), version integer not null, id uuid not null unique default gen_random_uuid(),
 snapshot jsonb not null, created_at timestamptz not null default now(), product_id text, price_id text, primary key(event_id,version)
);
alter table public.film_club_tickets enable row level security;
alter table public.film_club_ticket_audit enable row level security;
alter table public.film_club_stripe_operations enable row level security;
revoke all on public.film_club_tickets, public.film_club_ticket_audit, public.film_club_stripe_operations from public,anon,authenticated;
grant select,insert,update on public.film_club_tickets, public.film_club_stripe_operations to service_role;
grant select,insert on public.film_club_ticket_audit to service_role;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.orders, public.order_items from anon,authenticated;
grant select,insert,update,delete on public.orders,public.order_items to service_role;
-- Reuse existing reservations; no parallel inventory/payment system.
alter table public.checkout_reservations drop constraint checkout_reservations_kind_check;
alter table public.checkout_reservations add constraint checkout_reservations_kind_check check(kind in ('shop_order','tot_bundle','digital','film_screening_ticket'));
CREATE OR REPLACE FUNCTION public.reserve_checkout(p_member uuid,p_request uuid,p_kind text,p_fingerprint text,p_resource text,p_inventory jsonb,p_treats uuid[],p_params jsonb,p_expires timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.checkout_reservations; x record; available integer; held bigint; v jsonb; s public.film_club_screenings; film_id uuid; audience_cap integer;
BEGIN
 PERFORM pg_advisory_xact_lock(72625190001);
 IF p_member IS NULL OR p_request IS NULL OR p_kind IS NULL OR p_kind NOT IN ('shop_order','tot_bundle','digital','film_screening_ticket') OR nullif(p_fingerprint,'') IS NULL OR nullif(p_resource,'') IS NULL OR p_inventory IS NULL OR jsonb_typeof(p_inventory)<>'array' OR p_treats IS NULL OR p_params IS NULL OR jsonb_typeof(p_params)<>'object' OR p_params->>'mode' IS DISTINCT FROM 'payment' OR jsonb_typeof(p_params->'line_items') IS DISTINCT FROM 'array' OR p_expires IS NULL OR p_expires<now()+interval '29 minutes' OR p_expires>now()+interval '2 hours' THEN RAISE EXCEPTION 'Invalid checkout reservation'; END IF;
 IF jsonb_array_length(p_params->'line_items')=0 OR p_params->'metadata'->>'userId' IS DISTINCT FROM p_member::text OR p_params->>'client_reference_id' IS DISTINCT FROM p_member::text THEN RAISE EXCEPTION 'Checkout identity or lines missing'; END IF;
 SELECT * INTO r FROM public.checkout_reservations WHERE member_id=p_member AND (request_id=p_request OR p_request=ANY(request_ids)) FOR UPDATE;
 IF FOUND THEN
  IF r.fingerprint<>p_fingerprint OR r.kind<>p_kind THEN RAISE EXCEPTION 'Checkout intent changed'; END IF;
  IF r.state='released' THEN RAISE EXCEPTION 'Checkout expired; start a new purchase'; END IF;
  RETURN to_jsonb(r);
 END IF;
 SELECT * INTO r FROM public.checkout_reservations WHERE member_id=p_member AND resource_key=p_resource AND state IN ('creating','open','pending','paid') ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF r.fingerprint<>p_fingerprint OR r.kind<>p_kind THEN RAISE EXCEPTION 'Another checkout is already in progress'; END IF;
  UPDATE public.checkout_reservations SET request_ids=array_append(request_ids,p_request) WHERE id=r.id RETURNING * INTO r;
  RETURN to_jsonb(r);
 END IF;
 IF p_kind='film_screening_ticket' THEN
  film_id := (p_params->'metadata'->>'screening_id')::uuid;
  SELECT * INTO s FROM public.film_club_screenings WHERE event_id=film_id FOR UPDATE;
  IF NOT FOUND OR NOT s.sales_enabled OR NOT s.provider_authorized OR s.stripe_price_id IS NULL OR s.stripe_synced_version IS DISTINCT FROM s.pricing_version OR s.stripe_archived OR NOT EXISTS(SELECT 1 FROM public.events WHERE id=film_id AND status='published' AND is_public) OR s.sales_deadline IS NULL OR s.sales_deadline<=now() OR s.viewing_start IS NULL OR s.viewing_end IS NULL OR s.viewing_end<=now() THEN RAISE EXCEPTION 'Ticket sales are closed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.members WHERE id=p_member AND plan ~* '(reader|circle|printing|press)' AND lower(coalesce(subscription_status,'')) IN ('active','trialing')) THEN RAISE EXCEPTION 'An active paid membership is required'; END IF;
  IF jsonb_array_length(p_inventory)<>0 OR cardinality(p_treats)<>0 OR jsonb_array_length(p_params->'line_items')<>1 OR p_params->'line_items'->0->>'price' IS DISTINCT FROM s.stripe_price_id OR (p_params->'line_items'->0->>'quantity')::integer is distinct from 1 OR p_params->>'currency' IS DISTINCT FROM s.currency OR (p_params->'metadata'->>'amount_cents')::integer IS DISTINCT FROM coalesce(s.member_price_override_cents,round(s.ticket_price_cents*(100-s.member_discount_percent)/100)::integer) THEN RAISE EXCEPTION 'Ticket pricing changed'; END IF;
  IF EXISTS(SELECT 1 FROM public.film_club_tickets WHERE event_id=film_id AND member_id=p_member AND payment_status NOT IN ('failed','refunded')) THEN RAISE EXCEPTION 'You already have a ticket'; END IF;
  SELECT count(*) INTO held FROM public.checkout_reservations c WHERE c.kind='film_screening_ticket' AND c.stripe_params->'metadata'->>'screening_id'=film_id::text AND c.state IN ('creating','open','pending','paid','consumed');
  select capacity into audience_cap from public.events where id=film_id;
  if audience_cap is not null and (s.public_tickets is null or held+s.public_tickets>=audience_cap) then raise exception 'Audience capacity reached or public sales totals need review'; end if;
  -- Conservative: refunded tickets keep their seat until an administrator reviews capacity.
  IF s.member_ticket_limit IS NOT NULL AND held>=s.member_ticket_limit THEN RAISE EXCEPTION 'Member tickets are sold out'; END IF;
 END IF;
 IF p_kind='digital' THEN
  IF jsonb_array_length(p_inventory)<>0 OR cardinality(p_treats)<>0 OR NOT coalesce(p_params->'metadata'->>'itemType' IN ('article','audio','video'),false) OR nullif(p_params->'metadata'->>'articleId','') IS NULL THEN RAISE EXCEPTION 'Invalid digital allocation'; END IF;
  IF EXISTS(SELECT 1 FROM public.item_purchases WHERE member_id=p_member AND article_id=(p_params->'metadata'->>'articleId')::uuid AND item_type=p_params->'metadata'->>'itemType') THEN RAISE EXCEPTION 'Item already owned'; END IF;
 END IF;
 IF array_position(p_treats,NULL) IS NOT NULL OR cardinality(p_treats)<>(SELECT count(DISTINCT t) FROM unnest(p_treats) t) THEN RAISE EXCEPTION 'Invalid reservation treats'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(p_inventory) LOOP
  IF jsonb_typeof(v)<>'object' OR nullif(v->>'product_id','') IS NULL OR jsonb_typeof(v->'quantity')<>'number' OR NOT coalesce(v->>'quantity' ~ '^[1-9][0-9]*$',false) OR (v->>'quantity')::numeric>100000 THEN RAISE EXCEPTION 'Invalid reservation quantity'; END IF;
 END LOOP;
 FOR x IN SELECT (i->>'product_id')::uuid id,sum((i->>'quantity')::integer) qty FROM jsonb_array_elements(p_inventory) i GROUP BY 1 ORDER BY 1 LOOP
  SELECT inventory INTO available FROM public.shop_products WHERE id=x.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation product missing'; END IF;
  SELECT coalesce(sum((i->>'quantity')::integer),0) INTO held FROM public.checkout_reservations c CROSS JOIN LATERAL jsonb_array_elements(c.inventory) i WHERE c.state IN ('creating','open','pending','paid') AND (i->>'product_id')::uuid=x.id;
  IF available IS NOT NULL AND available-held<x.qty THEN RAISE EXCEPTION 'Product is out of stock'; END IF;
 END LOOP;
 FOR x IN SELECT (i->>'product_id')::uuid id,i->>'variant_id' vid,sum((i->>'quantity')::integer) qty FROM jsonb_array_elements(p_inventory) i WHERE nullif(i->>'variant_id','') IS NOT NULL GROUP BY 1,2 ORDER BY 1,2 LOOP
  SELECT z INTO v FROM public.shop_products p CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.variants,'[]')) z WHERE p.id=x.id AND z->>'printify_variant_id'=x.vid;
  IF NOT FOUND AND EXISTS(SELECT 1 FROM public.shop_products WHERE id=x.id AND jsonb_array_length(coalesce(variants,'[]'))>0) THEN RAISE EXCEPTION 'Reservation variant missing'; END IF;
  SELECT coalesce(sum((i->>'quantity')::integer),0) INTO held FROM public.checkout_reservations c CROSS JOIN LATERAL jsonb_array_elements(c.inventory) i WHERE c.state IN ('creating','open','pending','paid') AND (i->>'product_id')::uuid=x.id AND i->>'variant_id'=x.vid;
  IF v->>'inventory' IS NOT NULL AND (v->>'inventory')::integer-held<x.qty THEN RAISE EXCEPTION 'Variant is out of stock'; END IF;
 END LOOP;
 FOR x IN SELECT id,stock FROM public.tot_treats WHERE id=ANY(p_treats) ORDER BY id FOR UPDATE LOOP
  SELECT count(*) INTO held FROM public.checkout_reservations WHERE state IN ('creating','open','pending','paid') AND x.id=ANY(treat_ids);
  IF coalesce(x.stock,0)-held<1 THEN RAISE EXCEPTION 'Treat is out of stock'; END IF;
 END LOOP;
 IF cardinality(p_treats)<>(SELECT count(*) FROM public.tot_treats WHERE id=ANY(p_treats)) THEN RAISE EXCEPTION 'Reservation treat missing'; END IF;
 INSERT INTO public.checkout_reservations(member_id,request_id,kind,fingerprint,resource_key,inventory,treat_ids,stripe_params,expires_at)
 VALUES(p_member,p_request,p_kind,p_fingerprint,p_resource,p_inventory,p_treats,p_params,p_expires) RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;


create function public.save_film_ticket_settings(p_event uuid,p_actor uuid,p_patch jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare s public.film_club_screenings;
begin
 perform pg_advisory_xact_lock(72625190001);
 select * into s from public.film_club_screenings where event_id=p_event for update;
 if not found then raise exception 'Screening not found'; end if;
 if s.currency is distinct from p_patch->>'currency' and (exists(select 1 from public.film_club_tickets where event_id=p_event) or exists(select 1 from public.checkout_reservations where kind='film_screening_ticket' and stripe_params->'metadata'->>'screening_id'=p_event::text and state in ('creating','open','pending','paid'))) then raise exception 'Currency cannot change after ticket sales or open checkouts'; end if;
 update public.film_club_screenings set
 ticket_price_cents=(p_patch->>'ticket_price_cents')::integer,currency=p_patch->>'currency',
 member_discount_percent=(p_patch->>'member_discount_percent')::numeric,member_price_override_cents=(p_patch->>'member_price_override_cents')::integer,
 member_ticket_limit=(p_patch->>'member_ticket_limit')::integer,acquisition_cost_cents=(p_patch->>'acquisition_cost_cents')::integer,
 host_share_percent=(p_patch->>'host_share_percent')::numeric,host_share_eligibility=p_patch->>'host_share_eligibility',
 license_price_cents=(p_patch->>'license_price_cents')::integer,license_threshold=(p_patch->>'license_threshold')::integer,
 sales_deadline=(p_patch->>'sales_deadline')::timestamptz,viewing_start=(p_patch->>'viewing_start')::timestamptz,viewing_end=(p_patch->>'viewing_end')::timestamptz,
 ticket_url=nullif(p_patch->>'ticket_url',''),provider_authorized=(p_patch->>'provider_authorized')::boolean,ticket_settings=p_patch->'ticket_settings',sales_enabled=false,pricing_version=pricing_version+1
 where event_id=p_event;
 update public.events set title=p_patch->'event'->>'title',starts_at=(p_patch->'event'->>'starts_at')::timestamptz,ends_at=nullif(p_patch->'event'->>'ends_at','')::timestamptz,status=p_patch->'event'->>'status',capacity=(p_patch->'event'->>'capacity')::integer where id=p_event;
 insert into public.film_club_ticket_audit(event_id,actor_id,action,detail) values(p_event,p_actor,'settings_saved',jsonb_build_object('version',s.pricing_version+1));
end $$;

create function public.record_paid_film_ticket(p_reservation uuid,p_session text,p_payment text,p_amount integer,p_currency text,p_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.checkout_reservations; t public.film_club_tickets; o public.orders; m jsonb;
begin
 perform pg_advisory_xact_lock(72625190001);
 select * into r from public.checkout_reservations where id=p_reservation for update;
 if not found or r.kind<>'film_screening_ticket' or r.state not in ('paid','consumed') or r.stripe_session_id is distinct from p_session then raise exception 'Paid allocation mismatch'; end if;
 m:=r.stripe_params->'metadata';
 if p_amount is distinct from (m->>'amount_cents')::integer or p_currency is distinct from r.stripe_params->>'currency' then raise exception 'Paid amount mismatch'; end if;
 select * into t from public.film_club_tickets where reservation_id=r.id;
 if found then return to_jsonb(t); end if;
 insert into public.orders(member_id,stripe_session_id,stripe_payment_intent,email,order_number,status,subtotal_cents,shipping_cents,total_cents,currency,metadata)
 values(r.member_id,p_session,p_payment,p_email,'PARLOR-' || nextval('public.order_number_seq'::regclass),'processing',p_amount,0,p_amount,p_currency,jsonb_build_object('kind','film_screening_ticket','screening_id',m->>'screening_id','reservation_id',r.id)) returning * into o;
 insert into public.order_items(order_id,product_name,quantity,unit_price_cents,stripe_price_id,shop_product_id)
 values(o.id,m->>'product_name',1,p_amount,m->>'price_id',(m->>'shop_product_id')::uuid);
 insert into public.film_club_tickets(event_id,member_id,order_id,reservation_id,payment_status,amount_cents,currency,eligibility,stripe_price_id)
 values((m->>'screening_id')::uuid,r.member_id,o.id,r.id,'paid',p_amount,p_currency,jsonb_build_object('plan',m->>'eligible_plan','status',m->>'eligible_status','verified_at',r.created_at),m->>'price_id') returning * into t;
 update public.checkout_reservations set state='consumed',checked_at=now() where id=r.id;
 insert into public.film_club_ticket_audit(event_id,ticket_id,action) values(t.event_id,t.id,'payment_confirmed');
 return to_jsonb(t);
end $$;

create function public.update_film_ticket(p_ticket uuid,p_actor uuid,p_patch jsonb,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.film_club_tickets;
begin
 select * into t from public.film_club_tickets where id=p_ticket for update;
 if not found then raise exception 'Ticket not found'; end if;
 if p_action='fulfillment' then
  if not exists(select 1 from public.film_club_screenings where event_id=t.event_id and provider_authorized) then raise exception 'Confirm provider authorization first'; end if;
  if t.payment_status not in ('paid','partially_refunded') then raise exception 'Ticket payment is not eligible for access'; end if;
  update public.film_club_tickets set fulfillment_status=p_patch->>'fulfillment_status',viewing_url=case when p_patch ? 'viewing_url' then p_patch->>'viewing_url' else viewing_url end,instructions=case when p_patch ? 'instructions' then p_patch->>'instructions' else instructions end,fulfillment_notes=case when p_patch ? 'fulfillment_notes' then p_patch->>'fulfillment_notes' else fulfillment_notes end,access_expires_at=case when p_patch ? 'access_expires_at' then (p_patch->>'access_expires_at')::timestamptz else access_expires_at end,access_version=access_version+1,access_email_status='not_sent',updated_at=now() where id=t.id returning * into t;
 elsif p_action='payment' then
  update public.film_club_tickets set payment_status=p_patch->>'payment_status',refunded_cents=(p_patch->>'refunded_cents')::integer,
   fulfillment_status=case when p_patch->>'payment_status'='refunded' then 'cancelled' else fulfillment_status end,updated_at=now() where id=t.id returning * into t;
 else raise exception 'Unknown update'; end if;
 update public.orders set status=case when t.payment_status='refunded' then 'cancelled' when t.fulfillment_status='access_sent' then 'fulfilled' else 'processing' end where id=t.order_id;
 -- Credentials and internal notes are never copied into the audit payload.
 insert into public.film_club_ticket_audit(event_id,ticket_id,actor_id,action,detail) values(t.event_id,t.id,p_actor,p_action,jsonb_build_object('payment',t.payment_status,'fulfillment',t.fulfillment_status,'access_version',t.access_version));
 return to_jsonb(t);
end $$;

-- Block the retired complimentary registration path while retaining ordinary event RSVPs.
create function public.film_club_no_new_rsvps() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.film_club_screenings where event_id=new.event_id) and new.status in ('going','waitlist') and (tg_op='INSERT' or old.status not in ('going','waitlist')) then
  raise exception 'Purchase screening tickets through Film Club instead';
 end if;
 return new;
end $$;
create trigger film_club_no_new_rsvps before insert or update on public.event_rsvps for each row execute function public.film_club_no_new_rsvps();
revoke all on function public.save_film_ticket_settings(uuid,uuid,jsonb),public.record_paid_film_ticket(uuid,text,text,integer,text,text),public.update_film_ticket(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_film_ticket_settings(uuid,uuid,jsonb),public.record_paid_film_ticket(uuid,text,text,integer,text,text),public.update_film_ticket(uuid,uuid,jsonb,text) to service_role;

create function public.finish_film_price_sync(p_event uuid,p_version integer,p_product text,p_price text)
returns void language plpgsql security definer set search_path='' as $$
declare s public.film_club_screenings; product uuid;
begin
 perform pg_advisory_xact_lock(72625190001);
 select * into s from public.film_club_screenings where event_id=p_event for update;
 if not found or s.pricing_version<>p_version or not exists(select 1 from public.film_club_stripe_operations where event_id=p_event and version=p_version) then raise exception 'Pricing changed; synchronize current settings'; end if;
 product:=s.shop_product_id;
 if product is null then
  insert into public.shop_products(name,product_type,stripe_product_id,stripe_price_id,public_listing,active,price)
  values('Film Club member ticket','film_screening_ticket',p_product,p_price,false,false,0) returning id into product;
 else update public.shop_products set stripe_product_id=p_product,stripe_price_id=p_price where id=product; end if;
 update public.film_club_screenings set shop_product_id=product,stripe_product_id=p_product,stripe_price_id=p_price,stripe_synced_version=p_version,stripe_synced_at=now(),stripe_archived=false where event_id=p_event;
 update public.film_club_stripe_operations set product_id=p_product,price_id=p_price where event_id=p_event and version=p_version;
 insert into public.film_club_ticket_audit(event_id,action,detail) values(p_event,'stripe_synchronized',jsonb_build_object('version',p_version,'price',p_price));
end $$;
revoke all on function public.finish_film_price_sync(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.finish_film_price_sync(uuid,integer,text,text) to service_role;

create function public.set_film_ticket_sales(p_event uuid,p_actor uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare s public.film_club_screenings;
begin
 perform pg_advisory_xact_lock(72625190001);
 select * into s from public.film_club_screenings where event_id=p_event for update;
 if not found then raise exception 'Screening unavailable'; end if;
 if p_enabled and (not s.provider_authorized or s.stripe_price_id is null or s.stripe_synced_version is distinct from s.pricing_version or s.stripe_archived or s.sales_deadline is null or s.sales_deadline<=now() or s.viewing_start is null or s.viewing_end is null or s.viewing_end<=now() or not exists(select 1 from public.events where id=p_event and status='published' and is_public)) then raise exception 'Screening is not ready for sales'; end if;
 update public.film_club_screenings set sales_enabled=p_enabled where event_id=p_event;
 insert into public.film_club_ticket_audit(event_id,actor_id,action,detail) values(p_event,p_actor,'sales_changed',jsonb_build_object('enabled',p_enabled));
end $$;
revoke all on function public.set_film_ticket_sales(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_film_ticket_sales(uuid,uuid,boolean) to service_role;

create function public.sync_film_ticket_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.orders set status=case when new.payment_status='refunded' or new.fulfillment_status='cancelled' then 'cancelled' when new.fulfillment_status='access_sent' then 'fulfilled' else 'processing' end,
 fulfilled_at=case when new.fulfillment_status='access_sent' then coalesce(fulfilled_at,now()) else fulfilled_at end where id=new.order_id;
 return new;
end $$;
create trigger sync_film_ticket_order after update of fulfillment_status,payment_status on public.film_club_tickets for each row execute function public.sync_film_ticket_order();
revoke all on function public.sync_film_ticket_order() from public,anon,authenticated;

create function public.save_film_public_sales(p_event uuid,p_actor uuid,p_tickets integer,p_gross integer) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(72625190001);
 if p_tickets<0 or p_gross<0 then raise exception 'Invalid public sales totals'; end if;
 update public.film_club_screenings set public_tickets=p_tickets,public_gross_cents=p_gross,ticket_reported_at=now() where event_id=p_event;
 if not found then raise exception 'Screening not found'; end if;
 insert into public.film_club_ticket_audit(event_id,actor_id,action,detail) values(p_event,p_actor,'public_sales_reported',jsonb_build_object('tickets',p_tickets,'gross_minor_units',p_gross));
end $$;
revoke all on function public.save_film_public_sales(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.save_film_public_sales(uuid,uuid,integer,integer) to service_role;
commit;
