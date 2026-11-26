begin;
-- Follow-up to 20261125180000. Do not re-run or edit that installed migration.
alter table public.film_club_tickets
 add column stripe_fee_currency text,
 add column stripe_fee_checked_at timestamptz;

alter table public.film_club_screenings add column stripe_archive_checked_at timestamptz;

-- Sales timing comes from the event, never an independently entered deadline.
create function public.film_ticket_event_timing() returns trigger language plpgsql set search_path='' as $$
declare e public.events;
begin
 select * into e from public.events where id=new.event_id;
 new.sales_deadline:=e.starts_at;
 if coalesce(new.ticket_settings->>'format','live')='live' then
  new.viewing_start:=e.starts_at;
  new.viewing_end:=e.ends_at;
 else
  new.viewing_start:=coalesce(new.viewing_start,e.starts_at);
  new.viewing_end:=coalesce(new.viewing_end,e.ends_at);
 end if;
 if e.starts_at<=now() or e.status<>'published' then new.sales_enabled:=false; end if;
 return new;
end $$;
create trigger film_ticket_event_timing before insert or update on public.film_club_screenings
 for each row execute function public.film_ticket_event_timing();
create function public.film_ticket_follow_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.film_club_screenings set sales_deadline=new.starts_at,
  viewing_start=case when coalesce(ticket_settings->>'format','live')='live' then new.starts_at else viewing_start end,
  viewing_end=case when coalesce(ticket_settings->>'format','live')='live' then new.ends_at else viewing_end end
 where event_id=new.id;
 return new;
end $$;
create trigger film_ticket_follow_event after update of starts_at,ends_at,status on public.events
 for each row execute function public.film_ticket_follow_event();
update public.film_club_screenings set sales_deadline=sales_deadline;
revoke all on function public.film_ticket_event_timing(),public.film_ticket_follow_event() from public,anon,authenticated;

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
  IF NOT FOUND OR NOT s.sales_enabled OR s.stripe_price_id IS NULL OR s.stripe_synced_version IS DISTINCT FROM s.pricing_version OR s.stripe_archived OR NOT EXISTS(SELECT 1 FROM public.events WHERE id=film_id AND status='published' AND is_public AND starts_at>now()) OR s.sales_deadline IS NULL OR s.sales_deadline<=now() OR s.viewing_start IS NULL OR s.viewing_end IS NULL OR s.viewing_end<=now() THEN RAISE EXCEPTION 'Ticket sales are closed'; END IF;
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

create or replace function public.save_film_ticket_settings(p_event uuid,p_actor uuid,p_patch jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare s public.film_club_screenings; pricing_changed boolean;
begin
 perform pg_advisory_xact_lock(72625190001);
 select * into s from public.film_club_screenings where event_id=p_event for update;
 if not found then raise exception 'Screening not found'; end if;
 if s.currency is distinct from p_patch->>'currency' and (exists(select 1 from public.film_club_tickets where event_id=p_event) or exists(select 1 from public.checkout_reservations where kind='film_screening_ticket' and stripe_params->'metadata'->>'screening_id'=p_event::text and state in ('creating','open','pending','paid'))) then raise exception 'Currency cannot change after ticket sales or open checkouts'; end if;
 pricing_changed := s.ticket_price_cents is distinct from (p_patch->>'ticket_price_cents')::integer
  or s.currency is distinct from p_patch->>'currency'
  or s.member_discount_percent is distinct from (p_patch->>'member_discount_percent')::numeric
  or s.member_price_override_cents is distinct from (p_patch->>'member_price_override_cents')::integer
  or (select title from public.events where id=p_event) is distinct from p_patch->'event'->>'title';
 update public.film_club_screenings set
 ticket_price_cents=(p_patch->>'ticket_price_cents')::integer,currency=p_patch->>'currency',
 member_discount_percent=(p_patch->>'member_discount_percent')::numeric,member_price_override_cents=(p_patch->>'member_price_override_cents')::integer,
 member_ticket_limit=(p_patch->>'member_ticket_limit')::integer,acquisition_cost_cents=(p_patch->>'acquisition_cost_cents')::integer,
 host_share_percent=(p_patch->>'host_share_percent')::numeric,host_share_eligibility=p_patch->>'host_share_eligibility',
 license_price_cents=(p_patch->>'license_price_cents')::integer,license_threshold=(p_patch->>'license_threshold')::integer,
 sales_deadline=(p_patch->'event'->>'starts_at')::timestamptz,viewing_start=(p_patch->>'viewing_start')::timestamptz,viewing_end=(p_patch->>'viewing_end')::timestamptz,
 ticket_url=nullif(p_patch->>'ticket_url',''),ticket_settings=p_patch->'ticket_settings',sales_enabled=case when pricing_changed then false else sales_enabled end,pricing_version=pricing_version+case when pricing_changed then 1 else 0 end
 where event_id=p_event;
 update public.events set title=p_patch->'event'->>'title',starts_at=(p_patch->'event'->>'starts_at')::timestamptz,ends_at=nullif(p_patch->'event'->>'ends_at','')::timestamptz,status=p_patch->'event'->>'status',capacity=(p_patch->'event'->>'capacity')::integer where id=p_event;
 insert into public.film_club_ticket_audit(event_id,actor_id,action,detail) values(p_event,p_actor,'settings_saved',jsonb_build_object('version',s.pricing_version+case when pricing_changed then 1 else 0 end));
end $$;

create or replace function public.update_film_ticket(p_ticket uuid,p_actor uuid,p_patch jsonb,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.film_club_tickets;
begin
 select * into t from public.film_club_tickets where id=p_ticket for update;
 if not found then raise exception 'Ticket not found'; end if;
 if p_action='fulfillment' then
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

create or replace function public.set_film_ticket_sales(p_event uuid,p_actor uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare s public.film_club_screenings;
begin
 perform pg_advisory_xact_lock(72625190001);
 select * into s from public.film_club_screenings where event_id=p_event for update;
 if not found then raise exception 'Screening unavailable'; end if;
 if p_enabled and (s.stripe_price_id is null or s.stripe_synced_version is distinct from s.pricing_version or s.stripe_archived or s.sales_deadline is null or s.sales_deadline<=now() or s.viewing_start is null or s.viewing_end is null or s.viewing_end<=now() or not exists(select 1 from public.events where id=p_event and status='published' and is_public and starts_at>now())) then raise exception 'Screening is not ready for sales'; end if;
 update public.film_club_screenings set sales_enabled=p_enabled where event_id=p_event;
 insert into public.film_club_ticket_audit(event_id,actor_id,action,detail) values(p_event,p_actor,'sales_changed',jsonb_build_object('enabled',p_enabled));
end $$;
create function public.mark_finished_film_archived(p_event uuid,p_product text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.film_club_screenings s set stripe_archived=true,sales_enabled=false
 where s.event_id=p_event and s.stripe_product_id=p_product
  and exists(select 1 from public.events e where e.id=p_event and e.ends_at<=now());
 if not found then raise exception 'Screening has not ended or product changed'; end if;
 insert into public.film_club_ticket_audit(event_id,action,detail) values(p_event,'stripe_auto_archived',jsonb_build_object('product',p_product));
end $$;
revoke all on function public.mark_finished_film_archived(uuid,text) from public,anon,authenticated;
grant execute on function public.mark_finished_film_archived(uuid,text) to service_role;
commit;
