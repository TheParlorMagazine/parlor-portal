BEGIN;

-- Validate the existing schema before making any changes. This migration builds
-- on the orders, Printify, shop, Trick-or-Treat and email tracking migrations.
DO $preflight$
DECLARE dependency record; col text;
BEGIN
  FOR dependency IN SELECT * FROM jsonb_each_text('{
    "orders":"id,member_id,stripe_session_id,stripe_payment_intent,email,order_number,status,shipping_name,shipping_address,subtotal_cents,shipping_cents,total_cents,currency,admin_note,printify_order_id,printify_status",
    "order_items":"id,order_id,product_name,variant,quantity,unit_price_cents,image_url,stripe_price_id,shop_product_id,printify_product_id,printify_variant_id",
    "shop_products":"id,inventory,variants",
    "tot_treats":"id,stock",
    "stripe_email_deliveries":"id,stripe_event_id,email_type,recipient,status,updated_at",
    "email_automations":"id,enabled,sent_count"
  }'::jsonb) LOOP
    IF to_regclass('public.' || dependency.key) IS NULL THEN
      RAISE EXCEPTION 'Missing prerequisite table public.%. Apply the existing shop/email migrations first.', dependency.key;
    END IF;
    FOREACH col IN ARRAY string_to_array(dependency.value, ',') LOOP
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=dependency.key AND column_name=col) THEN
        RAISE EXCEPTION 'Missing prerequisite column public.%.%. Apply its existing migration first.', dependency.key, col;
      END IF;
    END LOOP;
  END LOOP;
  IF to_regclass('public.order_number_seq') IS NULL THEN
    RAISE EXCEPTION 'Missing order_number_seq. Apply the existing orders migration first.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='metadata' AND udt_name <> 'jsonb') THEN
    RAISE EXCEPTION 'orders.metadata has a custom type; review it before applying this migration. Expected jsonb.';
  END IF;
END;
$preflight$;

-- Persist the paid order, its lines and stock changes together. Retries reuse
-- the same order and cannot decrement stock twice.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.orders SET metadata='{}'::jsonb WHERE metadata IS NULL;
ALTER TABLE public.orders ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ALTER COLUMN metadata SET NOT NULL;
CREATE OR REPLACE FUNCTION public.checkout_inventory_key(p_inventory jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_array(id,vid,qty) ORDER BY id,vid),'[]') FROM
 (SELECT i->>'product_id' id,nullif(i->>'variant_id','') vid,sum((i->>'quantity')::integer) qty FROM jsonb_array_elements(p_inventory) i GROUP BY 1,2) a
$$;
REVOKE ALL ON FUNCTION public.checkout_inventory_key(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_inventory_key(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.record_paid_shop_order(p_session_id text, p_order jsonb, p_items jsonb, p_treat_ids uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o public.orders; r record; x jsonb; prior_items jsonb; shortages jsonb := '[]'::jsonb; available integer; variant_row record; fresh boolean := false; col text;
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
  RETURN to_jsonb(o);
END;
$$;
REVOKE ALL ON FUNCTION public.record_paid_shop_order(text,jsonb,jsonb,uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_paid_shop_order(text,jsonb,jsonb,uuid[]) TO service_role;

-- An explicitly rejected email is safe to retry. Unknown send outcomes remain
-- claimed to avoid duplicate receipts.
CREATE OR REPLACE FUNCTION public.claim_stripe_email(p_event_id text,p_email_type text,p_recipient text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE claimed_id uuid;
BEGIN
  INSERT INTO public.stripe_email_deliveries(stripe_event_id,email_type,recipient)
  VALUES(p_event_id,p_email_type,lower(trim(p_recipient)))
  ON CONFLICT(stripe_event_id,email_type,recipient) DO UPDATE SET status='sending',updated_at=now()
    WHERE public.stripe_email_deliveries.status='failed'
  RETURNING id INTO claimed_id;
  RETURN claimed_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_stripe_email(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_email(text,text,text) TO service_role;
INSERT INTO public.email_automations(id,enabled,sent_count) VALUES('order_confirmation',true,0) ON CONFLICT(id) DO NOTHING;

-- Order APIs enforce ownership/staff roles through the service-role backend;
-- shipping addresses must never be readable directly with the public client.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders, public.order_items FROM anon, authenticated;
GRANT ALL ON public.orders, public.order_items TO service_role;

COMMIT;
