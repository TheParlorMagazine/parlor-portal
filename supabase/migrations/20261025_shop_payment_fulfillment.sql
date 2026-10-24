-- Persist the paid order, its lines and stock changes together. Retries reuse
-- the same order and cannot decrement stock twice.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.orders SET metadata='{}'::jsonb WHERE metadata IS NULL;
ALTER TABLE public.orders ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ALTER COLUMN metadata SET NOT NULL;
CREATE OR REPLACE FUNCTION public.record_paid_shop_order(p_session_id text, p_order jsonb, p_items jsonb, p_treat_ids uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o public.orders; r record; shortages jsonb := '[]'::jsonb; available integer; variant_row record; fresh boolean := false;
BEGIN
  IF p_session_id IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Order and items required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_session_id, 0));
  SELECT * INTO o FROM public.orders WHERE stripe_session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    fresh := true;
    INSERT INTO public.orders(member_id,stripe_session_id,stripe_payment_intent,email,order_number,status,shipping_name,shipping_address,subtotal_cents,shipping_cents,total_cents,currency,metadata)
    VALUES ((p_order->>'member_id')::uuid,p_session_id,p_order->>'payment_intent',p_order->>'email','PARLOR-' || nextval('public.order_number_seq'::regclass),'processing',p_order->>'shipping_name',p_order->>'shipping_address',(p_order->>'subtotal_cents')::integer,(p_order->>'shipping_cents')::integer,(p_order->>'total_cents')::integer,p_order->>'currency',coalesce(p_order->'metadata','{}'::jsonb)) RETURNING * INTO o;
  END IF;
  -- Also repair old orders whose earlier webhook saved the header but no lines.
  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id=o.id) THEN
    INSERT INTO public.order_items(order_id,product_name,variant,quantity,unit_price_cents,image_url,stripe_price_id,shop_product_id,printify_product_id,printify_variant_id)
    SELECT o.id,x.product_name,x.variant,x.quantity,x.unit_price_cents,x.image_url,x.stripe_price_id,x.shop_product_id,x.printify_product_id,x.printify_variant_id
    FROM jsonb_to_recordset(p_items) AS x(product_name text,variant text,quantity integer,unit_price_cents integer,image_url text,stripe_price_id text,shop_product_id uuid,printify_product_id text,printify_variant_id bigint);
  END IF;
  IF fresh THEN
    FOR r IN SELECT id FROM public.tot_treats WHERE id=ANY(p_treat_ids) ORDER BY id FOR UPDATE LOOP
      SELECT stock INTO available FROM public.tot_treats WHERE id=r.id;
      IF coalesce(available,0)<1 THEN shortages := shortages || jsonb_build_array(r.id); END IF;
      UPDATE public.tot_treats SET stock=greatest(coalesce(stock,0)-1,0) WHERE id=r.id;
    END LOOP;
    FOR r IN SELECT (x->>'product_id')::uuid AS id, x->>'variant_id' AS variant_id, sum((x->>'quantity')::integer)::integer AS qty
      FROM jsonb_array_elements(coalesce(p_order->'inventory','[]'::jsonb)) x GROUP BY 1,2 ORDER BY 1,2 LOOP
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
