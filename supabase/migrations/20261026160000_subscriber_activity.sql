BEGIN;
DO $$ BEGIN
  IF to_regclass('public.campaign_email_deliveries') IS NULL OR to_regclass('public.email_subscription_events') IS NULL OR to_regclass('public.orders') IS NULL OR to_regclass('public.item_purchases') IS NULL THEN
    RAISE EXCEPTION 'Apply campaign engagement tracking and existing purchase migrations first.';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.subscriber_site_events (
  id uuid PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK(event_type IN ('page_view','click')),
  path text NOT NULL CHECK(length(path)<=500),
  target text CHECK(length(target)<=500),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriber_site_member_time_idx ON public.subscriber_site_events(member_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS subscriber_site_time_idx ON public.subscriber_site_events(occurred_at);
CREATE TABLE IF NOT EXISTS public.subscriber_account_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK(event_type IN ('profile_changed','subscription_changed')),
  changed_fields text[] NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriber_changes_member_time_idx ON public.subscriber_account_changes(member_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS subscriber_changes_time_idx ON public.subscriber_account_changes(occurred_at);
ALTER TABLE public.subscriber_site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_account_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscriber_site_events,public.subscriber_account_changes FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.subscriber_site_events,public.subscriber_account_changes TO service_role;

CREATE OR REPLACE FUNCTION public.record_subscriber_site_event(p_member uuid,p_event uuid,p_type text,p_path text,p_target text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_member IS NULL OR p_event IS NULL OR p_type IS NULL OR p_type NOT IN ('page_view','click') OR p_path IS NULL OR left(p_path,1)<>'/' OR p_path LIKE '%?%' OR p_path LIKE '%#%' OR length(p_path)>500 OR length(p_target)>500 OR p_target LIKE '%?%' OR p_target LIKE '%#%' OR (p_type='click' AND p_target IS NULL) THEN RAISE EXCEPTION 'Invalid site event'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text,7262616));
  IF EXISTS(SELECT 1 FROM public.subscriber_site_events WHERE id=p_event) THEN RETURN false; END IF;
  IF (SELECT count(*) FROM public.subscriber_site_events WHERE member_id=p_member AND occurred_at>now()-interval '1 minute')>=120 THEN RETURN false; END IF;
  INSERT INTO public.subscriber_site_events(id,member_id,event_type,path,target) VALUES(p_event,p_member,p_type,p_path,p_target);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_subscriber_site_event(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_subscriber_site_event(uuid,uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_subscriber_account_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE profile_fields text[]:=ARRAY[]::text[]; subscription_fields text[]:=ARRAY[]::text[]; field text; before_row jsonb:=to_jsonb(OLD); after_row jsonb:=to_jsonb(NEW);
BEGIN
  FOREACH field IN ARRAY ARRAY['full_name','email','headline','bio','avatar_url','banner_url','mailing_address','phone'] LOOP
    IF before_row->field IS DISTINCT FROM after_row->field THEN profile_fields:=array_append(profile_fields,field); END IF;
  END LOOP;
  FOREACH field IN ARRAY ARRAY['plan','plan_id','subscription_status','stripe_subscription_id','print_subscriber'] LOOP
    IF before_row->field IS DISTINCT FROM after_row->field THEN subscription_fields:=array_append(subscription_fields,field); END IF;
  END LOOP;
  -- Only field names are retained, never addresses, biographies or previous values.
  IF cardinality(profile_fields)>0 THEN INSERT INTO public.subscriber_account_changes(member_id,event_type,changed_fields) VALUES(NEW.id,'profile_changed',profile_fields); END IF;
  IF cardinality(subscription_fields)>0 THEN INSERT INTO public.subscriber_account_changes(member_id,event_type,changed_fields) VALUES(NEW.id,'subscription_changed',subscription_fields); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS record_subscriber_account_change ON public.members;
CREATE TRIGGER record_subscriber_account_change AFTER UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.record_subscriber_account_change();
REVOKE ALL ON FUNCTION public.record_subscriber_account_change() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE VIEW public.subscriber_activity_feed AS
SELECT s.id::text AS id,s.member_id,s.occurred_at,'site'::text AS source,s.event_type AS kind,s.path AS label,jsonb_build_object('target',s.target) AS detail FROM public.subscriber_site_events s
UNION ALL
SELECT a.id::text,a.member_id,a.occurred_at,'account',a.event_type,a.event_type,jsonb_build_object('fields',a.changed_fields) FROM public.subscriber_account_changes a
UNION ALL
SELECT e.event_id,d.member_id,e.occurred_at,'email',e.event_type,c.subject,jsonb_build_object('campaign_id',c.id,'campaign_name',c.name,'link',e.link)
FROM public.campaign_email_events e JOIN public.campaign_email_deliveries d ON d.provider_email_id=e.provider_email_id JOIN public.email_campaigns c ON c.id=d.campaign_id
UNION ALL
SELECT u.id::text,u.member_id,u.occurred_at,'newsletter',u.event_type,coalesce(c.subject,'Email preferences'),jsonb_build_object('source',u.source,'campaign_id',u.campaign_id)
FROM public.email_subscription_events u LEFT JOIN public.email_campaigns c ON c.id=u.campaign_id
UNION ALL
SELECT o.id::text,o.member_id,o.placed_at,'purchase','shop_order',o.order_number,jsonb_build_object('total_cents',o.total_cents,'currency',o.currency,'status',o.status)
FROM public.orders o
UNION ALL
SELECT p.id::text,p.member_id,coalesce((to_jsonb(p)->>'purchased_at')::timestamptz,(to_jsonb(p)->>'created_at')::timestamptz),'purchase','article_purchase',coalesce(a.title,'Article purchase'),jsonb_build_object('item_type',p.item_type)
FROM public.item_purchases p LEFT JOIN public.articles a ON a.id=p.article_id;
REVOKE ALL ON public.subscriber_activity_feed FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.subscriber_activity_feed TO service_role;

CREATE OR REPLACE FUNCTION public.subscriber_activity_30_days(p_member uuid,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
WITH recent AS MATERIALIZED (
 SELECT * FROM public.subscriber_activity_feed WHERE member_id=p_member AND occurred_at>=now()-interval '30 days' AND occurred_at<=now()
), pages AS (
 SELECT label AS path,count(*) AS views,max(occurred_at) AS last_visited_at FROM recent WHERE kind='page_view' GROUP BY label ORDER BY count(*) DESC,label LIMIT 10
), clicks AS (
 SELECT detail->>'target' AS target,count(*) AS clicks FROM recent WHERE kind='click' GROUP BY detail->>'target' ORDER BY count(*) DESC,detail->>'target' LIMIT 10
), events AS (
 SELECT * FROM recent ORDER BY occurred_at DESC,source,id LIMIT 51 OFFSET greatest(0,least(p_offset,100000))
)
SELECT jsonb_build_object(
 'window_start',now()-interval '30 days','as_of',now(),
 'top_pages',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM pages p),'[]'::jsonb),
 'top_clicks',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM clicks c),'[]'::jsonb),
 'counts',jsonb_build_object('page_views',(SELECT count(*) FROM recent WHERE kind='page_view'),'site_clicks',(SELECT count(*) FROM recent WHERE kind='click'),'email_opens',(SELECT count(*) FROM recent WHERE kind='email.opened'),'email_clicks',(SELECT count(*) FROM recent WHERE kind='email.clicked'),'orders',(SELECT count(*) FROM recent WHERE kind='shop_order'),'article_purchases',(SELECT count(*) FROM recent WHERE kind='article_purchase'),'account_changes',(SELECT count(*) FROM recent WHERE source IN ('account','newsletter'))),
 'events',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM events e),'[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.subscriber_activity_30_days(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.subscriber_activity_30_days(uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.prune_subscriber_activity()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM public.subscriber_site_events WHERE occurred_at<now()-interval '30 days';
 DELETE FROM public.subscriber_account_changes WHERE occurred_at<now()-interval '30 days';
$$;
REVOKE ALL ON FUNCTION public.prune_subscriber_activity() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prune_subscriber_activity() TO service_role;
COMMIT;
