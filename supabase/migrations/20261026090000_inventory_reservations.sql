BEGIN;
-- Holds allocate the existing on-hand inventory; they never add to or replace it.
CREATE TABLE IF NOT EXISTS public.checkout_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL,
 request_id uuid NOT NULL, request_ids uuid[] NOT NULL DEFAULT '{}', kind text NOT NULL CHECK(kind IN ('shop_order','tot_bundle','digital')),
 fingerprint text NOT NULL, resource_key text NOT NULL, inventory jsonb NOT NULL, treat_ids uuid[] NOT NULL,
 stripe_params jsonb NOT NULL, stripe_session_id text UNIQUE,
 state text NOT NULL DEFAULT 'creating' CHECK(state IN ('creating','open','pending','paid','consumed','released')),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), checked_at timestamptz,
 UNIQUE(member_id,request_id)
);
ALTER TABLE public.checkout_reservations ADD COLUMN IF NOT EXISTS request_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS checkout_reservations_live_idx ON public.checkout_reservations(state,checked_at);
ALTER TABLE public.checkout_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.checkout_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_checkout(p_member uuid,p_request uuid,p_kind text,p_fingerprint text,p_resource text,p_inventory jsonb,p_treats uuid[],p_params jsonb,p_expires timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.checkout_reservations; x record; available integer; held bigint; v jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(72625190001);
 IF p_member IS NULL OR p_request IS NULL OR p_kind IS NULL OR p_kind NOT IN ('shop_order','tot_bundle','digital') OR nullif(p_fingerprint,'') IS NULL OR nullif(p_resource,'') IS NULL OR p_inventory IS NULL OR jsonb_typeof(p_inventory)<>'array' OR p_treats IS NULL OR p_params IS NULL OR jsonb_typeof(p_params)<>'object' OR p_params->>'mode' IS DISTINCT FROM 'payment' OR jsonb_typeof(p_params->'line_items') IS DISTINCT FROM 'array' OR p_expires IS NULL OR p_expires<now()+interval '29 minutes' OR p_expires>now()+interval '2 hours' THEN RAISE EXCEPTION 'Invalid checkout reservation'; END IF;
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

-- Only the trusted server calls this after checking the CURRENT Stripe object.
-- Time alone NEVER releases a potentially paid or asynchronously processing hold.
CREATE OR REPLACE FUNCTION public.observe_checkout(p_id uuid,p_session text,p_state text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.checkout_reservations;
BEGIN
 PERFORM pg_advisory_xact_lock(72625190001);
 SELECT * INTO r FROM public.checkout_reservations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation missing'; END IF;
 IF p_state NOT IN ('open','pending','paid','released') OR nullif(p_session,'') IS NULL THEN RAISE EXCEPTION 'Invalid observation'; END IF;
 IF r.stripe_session_id IS NOT NULL AND r.stripe_session_id<>p_session THEN RAISE EXCEPTION 'Conflicting Stripe session'; END IF;
 IF r.state IN ('paid','consumed') AND p_state<>'paid' THEN RETURN to_jsonb(r); END IF;
 IF r.state='released' AND p_state<>'paid' THEN RETURN to_jsonb(r); END IF;
 UPDATE public.checkout_reservations SET stripe_session_id=p_session,state=CASE WHEN state='consumed' THEN state ELSE p_state END,checked_at=now() WHERE id=p_id RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;

REVOKE ALL ON FUNCTION public.reserve_checkout(uuid,uuid,text,text,text,jsonb,uuid[],jsonb,timestamptz),public.observe_checkout(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_checkout(uuid,uuid,text,text,text,jsonb,uuid[],jsonb,timestamptz),public.observe_checkout(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.checkout_inventory_key(p_inventory jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_array(id,vid,qty) ORDER BY id,vid),'[]') FROM
 (SELECT i->>'product_id' id,nullif(i->>'variant_id','') vid,sum((i->>'quantity')::integer) qty FROM jsonb_array_elements(p_inventory) i GROUP BY 1,2) a
$$;
REVOKE ALL ON FUNCTION public.checkout_inventory_key(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_inventory_key(jsonb) TO service_role;

-- Replace the preceding migration function with reservation-aware consumption.
CREATE OR REPLACE FUNCTION public.record_paid_shop_order(p_session_id text, p_order jsonb, p_items jsonb, p_treat_ids uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o public.orders; r record; x jsonb; prior_items jsonb; shortages jsonb := '[]'::jsonb; available integer; variant_row record; fresh boolean := false; col text; reservation public.checkout_reservations;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id))=0 OR length(p_session_id)>255 THEN RAISE EXCEPTION 'Valid session required'; END IF;
  IF p_order IS NULL OR jsonb_typeof(p_order)<>'object' OR p_items IS NULL OR jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Order object and items array required'; END IF;
  IF p_order ? 'metadata' AND jsonb_typeof(p_order->'metadata')<>'object' THEN RAISE EXCEPTION 'Invalid order metadata'; END IF;
  IF jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Items required'; END IF;
  FOREACH col IN ARRAY ARRAY['subtotal_cents','shipping_cents','total_cents'] LOOP
    IF jsonb_typeof(p_order->col)<>'number' OR NOT coalesce(p_order->>col ~ '^[0-9]+$',false) OR (p_order->>col)::numeric>2147483647 THEN RAISE EXCEPTION 'Invalid monetary value: %',col; END IF;
  END LOOP;
  IF NOT coalesce(p_order->>'currency' ~ '^[a-z]{3}$',false) THEN RAISE EXCEPTION 'Invalid currency'; END IF;
  FOR x IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(x)<>'object' OR jsonb_typeof(x->'product_name')<>'string' OR nullif(trim(x->>'product_name'),'') IS NULL OR jsonb_typeof(x->'quantity')<>'number' OR NOT coalesce(x->>'quantity' ~ '^[1-9][0-9]*$',false) OR (x->>'quantity')::numeric>100000 OR jsonb_typeof(x->'unit_price_cents')<>'number' OR NOT coalesce(x->>'unit_price_cents' ~ '^[0-9]+$',false) OR (x->>'unit_price_cents')::numeric>2147483647 THEN RAISE EXCEPTION 'Invalid order item'; END IF;
  END LOOP;
  IF NOT (p_order ? 'inventory') OR jsonb_typeof(p_order->'inventory')<>'array' THEN RAISE EXCEPTION 'Inventory array required'; END IF;
  FOR x IN SELECT value FROM jsonb_array_elements(p_order->'inventory') LOOP
    IF jsonb_typeof(x)<>'object' OR jsonb_typeof(x->'quantity')<>'number' OR NOT coalesce(x->>'quantity' ~ '^[1-9][0-9]*$',false) OR (x->>'quantity')::numeric>100000 OR nullif(x->>'product_id','') IS NULL THEN RAISE EXCEPTION 'Invalid inventory component'; END IF;
    PERFORM (x->>'product_id')::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.orders WHERE stripe_session_id=p_session_id) AND NOT EXISTS(SELECT 1 FROM public.shop_products WHERE id=(x->>'product_id')::uuid) THEN RAISE EXCEPTION 'Inventory product missing'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.orders WHERE stripe_session_id=p_session_id) AND nullif(x->>'variant_id','') IS NOT NULL AND EXISTS(SELECT 1 FROM public.shop_products WHERE id=(x->>'product_id')::uuid AND jsonb_array_length(coalesce(variants,'[]'))>0) AND NOT EXISTS(SELECT 1 FROM public.shop_products p,jsonb_array_elements(p.variants) v WHERE p.id=(x->>'product_id')::uuid AND v->>'printify_variant_id'=x->>'variant_id') THEN RAISE EXCEPTION 'Inventory variant missing'; END IF;
  END LOOP;
  IF p_order->'metadata' ? 'packing_items' THEN
    IF jsonb_typeof(p_order->'metadata'->'packing_items')<>'array' THEN RAISE EXCEPTION 'Packing array required'; END IF;
    FOR x IN SELECT value FROM jsonb_array_elements(p_order->'metadata'->'packing_items') LOOP
      IF jsonb_typeof(x->'quantity')<>'number' OR NOT coalesce(x->>'quantity' ~ '^[1-9][0-9]*$',false) THEN RAISE EXCEPTION 'Invalid packing quantity'; END IF;
    END LOOP;
    IF public.checkout_inventory_key(p_order->'inventory') IS DISTINCT FROM public.checkout_inventory_key((SELECT coalesce(jsonb_agg(jsonb_build_object('product_id',pack->>'product_id','variant_id',pack->>'printify_variant_id','quantity',pack->'quantity')),'[]') FROM jsonb_array_elements(p_order->'metadata'->'packing_items') pack WHERE nullif(pack->>'product_id','') IS NOT NULL)) THEN RAISE EXCEPTION 'Packing inventory mismatch'; END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) item WHERE nullif(item->>'shop_product_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_order->'inventory') inv WHERE inv->>'product_id'=item->>'shop_product_id')) THEN RAISE EXCEPTION 'Purchased inventory missing'; END IF;
  END IF;
  IF p_treat_ids IS NULL OR array_position(p_treat_ids,NULL) IS NOT NULL OR cardinality(p_treat_ids)<>(SELECT count(DISTINCT t) FROM unnest(p_treat_ids) t) OR (NOT EXISTS(SELECT 1 FROM public.orders WHERE stripe_session_id=p_session_id) AND cardinality(p_treat_ids)<>(SELECT count(*) FROM public.tot_treats WHERE id=ANY(p_treat_ids))) THEN RAISE EXCEPTION 'Invalid treat ids'; END IF;
  -- All reservation and paid-stock operations share this lock order.
  PERFORM pg_advisory_xact_lock(72625190001);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_session_id, 0));
  IF nullif(p_order->'metadata'->>'reservation_id','') IS NOT NULL THEN
    SELECT * INTO reservation FROM public.checkout_reservations WHERE id=(p_order->'metadata'->>'reservation_id')::uuid FOR UPDATE;
    IF NOT FOUND OR reservation.state NOT IN ('paid','consumed') OR reservation.stripe_session_id IS DISTINCT FROM p_session_id OR reservation.member_id IS DISTINCT FROM (p_order->>'member_id')::uuid OR public.checkout_inventory_key(reservation.inventory) IS DISTINCT FROM public.checkout_inventory_key(p_order->'inventory') OR (SELECT array_agg(t ORDER BY t) FROM unnest(reservation.treat_ids) t) IS DISTINCT FROM (SELECT array_agg(t ORDER BY t) FROM unnest(p_treat_ids) t) THEN RAISE EXCEPTION 'Paid allocation does not match order'; END IF;
  END IF;
  SELECT * INTO o FROM public.orders WHERE stripe_session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    fresh := true;
    INSERT INTO public.orders(member_id,stripe_session_id,stripe_payment_intent,email,order_number,status,shipping_name,shipping_address,subtotal_cents,shipping_cents,total_cents,currency,metadata)
    VALUES ((p_order->>'member_id')::uuid,p_session_id,p_order->>'payment_intent',p_order->>'email','PARLOR-' || nextval('public.order_number_seq'::regclass),'processing',p_order->>'shipping_name',p_order->>'shipping_address',(p_order->>'subtotal_cents')::integer,(p_order->>'shipping_cents')::integer,(p_order->>'total_cents')::integer,p_order->>'currency',coalesce(p_order->'metadata','{}'::jsonb)) RETURNING * INTO o;
  ELSE
    IF (o.stripe_payment_intent IS NOT NULL AND o.stripe_payment_intent IS DISTINCT FROM p_order->>'payment_intent') OR (o.total_cents IS NOT NULL AND o.total_cents IS DISTINCT FROM (p_order->>'total_cents')::integer) OR (o.subtotal_cents IS NOT NULL AND o.subtotal_cents IS DISTINCT FROM (p_order->>'subtotal_cents')::integer) OR (o.shipping_cents IS NOT NULL AND o.shipping_cents IS DISTINCT FROM (p_order->>'shipping_cents')::integer) OR (o.currency IS NOT NULL AND o.currency IS DISTINCT FROM p_order->>'currency') OR (o.member_id IS NOT NULL AND nullif(p_order->>'member_id','') IS NOT NULL AND o.member_id<>(p_order->>'member_id')::uuid) THEN RAISE EXCEPTION 'Conflicting paid session'; END IF;
    IF o.metadata ? 'packing_items' AND public.checkout_inventory_key(p_order->'inventory') IS DISTINCT FROM public.checkout_inventory_key((SELECT coalesce(jsonb_agg(jsonb_build_object('product_id',pack->>'product_id','variant_id',pack->>'printify_variant_id','quantity',pack->'quantity')),'[]') FROM jsonb_array_elements(o.metadata->'packing_items') pack WHERE nullif(pack->>'product_id','') IS NOT NULL)) THEN RAISE EXCEPTION 'Conflicting paid allocation'; END IF;
    IF o.metadata->>'kind' IS NOT NULL AND o.metadata->>'kind' IS DISTINCT FROM p_order->'metadata'->>'kind' THEN RAISE EXCEPTION 'Conflicting checkout kind'; END IF;
    SELECT jsonb_agg(jsonb_build_array(product_name,variant,quantity,unit_price_cents) ORDER BY product_name,variant,quantity,unit_price_cents) INTO prior_items FROM public.order_items WHERE order_id=o.id;
    IF prior_items IS NOT NULL AND prior_items IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_array(i->>'product_name',i->>'variant',(i->>'quantity')::integer,(i->>'unit_price_cents')::integer) ORDER BY i->>'product_name',i->>'variant',(i->>'quantity')::integer,(i->>'unit_price_cents')::integer) FROM jsonb_array_elements(p_items) i) THEN RAISE EXCEPTION 'Conflicting paid items'; END IF;
  END IF;
  -- Fill only missing historical identity/amount fields and packing snapshots.
  UPDATE public.orders SET stripe_payment_intent=coalesce(stripe_payment_intent,p_order->>'payment_intent'),total_cents=coalesce(total_cents,(p_order->>'total_cents')::integer),subtotal_cents=coalesce(subtotal_cents,(p_order->>'subtotal_cents')::integer),shipping_cents=coalesce(shipping_cents,(p_order->>'shipping_cents')::integer),currency=coalesce(currency,p_order->>'currency'),metadata=CASE WHEN NOT (metadata ? 'packing_items') AND p_order->'metadata' ? 'packing_items' THEN metadata || (p_order->'metadata') ELSE metadata END WHERE id=o.id RETURNING * INTO o;
  -- Also repair old orders whose earlier webhook saved the header but no lines.
  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id=o.id) THEN
    INSERT INTO public.order_items(order_id,product_name,variant,quantity,unit_price_cents,image_url,stripe_price_id,shop_product_id,printify_product_id,printify_variant_id)
    SELECT o.id,line.product_name,line.variant,line.quantity,line.unit_price_cents,line.image_url,line.stripe_price_id,line.shop_product_id,line.printify_product_id,line.printify_variant_id
    FROM jsonb_to_recordset(p_items) AS line(product_name text,variant text,quantity integer,unit_price_cents integer,image_url text,stripe_price_id text,shop_product_id uuid,printify_product_id text,printify_variant_id bigint);
  END IF;
  IF fresh THEN
    FOR r IN SELECT id FROM public.tot_treats WHERE id=ANY(p_treat_ids) ORDER BY id FOR UPDATE LOOP
      SELECT stock INTO available FROM public.tot_treats WHERE id=r.id;
      IF coalesce(available,0)<1 THEN shortages := shortages || jsonb_build_array(r.id); END IF;
      UPDATE public.tot_treats SET stock=greatest(coalesce(stock,0)-1,0) WHERE id=r.id;
    END LOOP;
    FOR r IN SELECT (inv->>'product_id')::uuid AS id, inv->>'variant_id' AS variant_id, sum((inv->>'quantity')::integer)::integer AS qty
      FROM jsonb_array_elements(coalesce(p_order->'inventory','[]'::jsonb)) inv GROUP BY 1,2 ORDER BY 1,2 LOOP
      SELECT inventory INTO available FROM public.shop_products WHERE id=r.id FOR UPDATE;
      IF available IS NOT NULL THEN
        IF available<r.qty THEN shortages := shortages || jsonb_build_array(r.id); END IF;
        UPDATE public.shop_products SET inventory=greatest(inventory-r.qty,0) WHERE id=r.id;
      END IF;
      IF r.variant_id IS NOT NULL THEN
        FOR variant_row IN SELECT value,ordinality FROM public.shop_products,jsonb_array_elements(coalesce(variants,'[]'::jsonb)) WITH ORDINALITY
          WHERE id=r.id AND value->>'printify_variant_id'=r.variant_id AND value->>'inventory' IS NOT NULL LOOP
          available := (variant_row.value->>'inventory')::integer;
          IF available<r.qty THEN shortages := shortages || jsonb_build_array(r.id); END IF;
          UPDATE public.shop_products SET variants=jsonb_set(variants,ARRAY[(variant_row.ordinality-1)::text,'inventory'],to_jsonb(greatest(available-r.qty,0))) WHERE id=r.id;
        END LOOP;
      END IF;
    END LOOP;
    IF jsonb_array_length(shortages)>0 THEN
      UPDATE public.orders SET metadata=metadata || jsonb_build_object('stock_review_required',shortages),admin_note=concat_ws(E'\n',admin_note,'Paid order needs stock review; do not request another payment.') WHERE id=o.id RETURNING * INTO o;
    END IF;
  END IF;
  IF reservation.id IS NOT NULL THEN UPDATE public.checkout_reservations SET state='consumed',checked_at=now() WHERE id=reservation.id; END IF;
  RETURN to_jsonb(o);
END;
$$;
REVOKE ALL ON FUNCTION public.record_paid_shop_order(text,jsonb,jsonb,uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_paid_shop_order(text,jsonb,jsonb,uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_digital_checkout(p_id uuid,p_session text,p_member uuid,p_article uuid,p_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(72625190001);
 IF NOT EXISTS(SELECT 1 FROM public.item_purchases WHERE member_id=p_member AND article_id=p_article AND item_type=p_type) THEN RAISE EXCEPTION 'Entitlement missing'; END IF;
 UPDATE public.checkout_reservations SET state='consumed',checked_at=now() WHERE id=p_id AND stripe_session_id=p_session AND member_id=p_member AND kind='digital' AND state IN ('paid','consumed');
 IF NOT FOUND THEN RAISE EXCEPTION 'Digital allocation mismatch'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.consume_digital_checkout(uuid,text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_digital_checkout(uuid,text,uuid,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.release_uncreated_checkout(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(72625190001);
 UPDATE public.checkout_reservations SET state='released',checked_at=now() WHERE id=p_id AND state='creating' AND stripe_session_id IS NULL AND expires_at<now()-interval '1 minute';
END $$;
REVOKE ALL ON FUNCTION public.release_uncreated_checkout(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_uncreated_checkout(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.reject_checkout_creation(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(72625190001);
 UPDATE public.checkout_reservations SET state='released',checked_at=now() WHERE id=p_id AND state='creating' AND stripe_session_id IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.reject_checkout_creation(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reject_checkout_creation(uuid) TO service_role;
COMMIT;
