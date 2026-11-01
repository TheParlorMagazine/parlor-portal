BEGIN;
DO $$ BEGIN
  IF to_regclass('public.email_campaigns') IS NULL OR to_regclass('public.members') IS NULL THEN
    RAISE EXCEPTION 'Apply the existing members and email campaign migrations first.';
  END IF;
END $$;

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS engagement_tracking_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.campaign_email_deliveries (
  provider_email_id text PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_deliveries_campaign_idx ON public.campaign_email_deliveries(campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS campaign_delivery_member_idx ON public.campaign_email_deliveries(campaign_id,member_id) WHERE member_id IS NOT NULL;

-- Events deliberately have no delivery FK: signed events can arrive before the
-- send response is saved. They become attributable as soon as that mapping lands.
CREATE TABLE IF NOT EXISTS public.campaign_email_events (
  event_id text PRIMARY KEY,
  provider_email_id text NOT NULL,
  event_type text NOT NULL CHECK(event_type IN ('email.delivered','email.opened','email.clicked','email.bounced','email.failed','email.complained')),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  link text
);
CREATE INDEX IF NOT EXISTS campaign_events_email_type_idx ON public.campaign_email_events(provider_email_id,event_type);
ALTER TABLE public.campaign_email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaign_email_deliveries,public.campaign_email_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.campaign_email_deliveries,public.campaign_email_events TO service_role;

CREATE OR REPLACE FUNCTION public.campaign_tracking_stats(p_campaign_ids uuid[])
RETURNS TABLE(campaign_id uuid,tracked boolean,accepted_count bigint,delivered_count bigint,open_count bigint,click_count bigint,total_open_count bigint,total_click_count bigint,bounced_count bigint,failed_count bigint,complained_count bigint,last_event_at timestamptz,links jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
WITH selected AS (
  SELECT c.id,c.engagement_tracking_enabled FROM public.email_campaigns c WHERE c.id=ANY(p_campaign_ids)
), per_email AS (
  SELECT d.campaign_id,d.provider_email_id,
    bool_or(e.event_type='email.delivered') AS delivered,
    bool_or(e.event_type='email.opened') AS opened,
    bool_or(e.event_type='email.clicked') AS clicked,
    bool_or(e.event_type='email.bounced') AS bounced,
    bool_or(e.event_type='email.failed') AS failed,
    bool_or(e.event_type='email.complained') AS complained,
    count(e.event_id) FILTER(WHERE e.event_type='email.opened') AS opens,
    count(e.event_id) FILTER(WHERE e.event_type='email.clicked') AS clicks,
    max(e.occurred_at) AS last_event_at
  FROM public.campaign_email_deliveries d
  JOIN selected s ON s.id=d.campaign_id
  LEFT JOIN public.campaign_email_events e ON e.provider_email_id=d.provider_email_id
  GROUP BY d.campaign_id,d.provider_email_id
), totals AS (
  SELECT p.campaign_id,count(*) AS accepted_count,
    count(*) FILTER(WHERE p.delivered) AS delivered_count,
    count(*) FILTER(WHERE p.opened) AS open_count,
    count(*) FILTER(WHERE p.clicked) AS click_count,
    sum(p.opens)::bigint AS total_open_count,sum(p.clicks)::bigint AS total_click_count,
    count(*) FILTER(WHERE p.bounced) AS bounced_count,
    count(*) FILTER(WHERE p.failed) AS failed_count,
    count(*) FILTER(WHERE p.complained) AS complained_count,
    max(p.last_event_at) AS last_event_at
  FROM per_email p GROUP BY p.campaign_id
)
SELECT s.id,s.engagement_tracking_enabled,
  coalesce(t.accepted_count,0),coalesce(t.delivered_count,0),coalesce(t.open_count,0),coalesce(t.click_count,0),
  coalesce(t.total_open_count,0),coalesce(t.total_click_count,0),coalesce(t.bounced_count,0),coalesce(t.failed_count,0),coalesce(t.complained_count,0),t.last_event_at,
  coalesce((SELECT jsonb_agg(to_jsonb(top_link)) FROM (
    SELECT e.link,count(*) AS total_clicks,count(DISTINCT e.provider_email_id) AS unique_clicks
    FROM public.campaign_email_events e JOIN public.campaign_email_deliveries d ON d.provider_email_id=e.provider_email_id
    WHERE d.campaign_id=s.id AND e.event_type='email.clicked' AND e.link IS NOT NULL
    GROUP BY e.link ORDER BY count(*) DESC,e.link LIMIT 10
  ) top_link),'[]'::jsonb)
FROM selected s LEFT JOIN totals t ON t.campaign_id=s.id;
$$;
REVOKE ALL ON FUNCTION public.campaign_tracking_stats(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_tracking_stats(uuid[]) TO service_role;

-- Preference changes are recorded in the same transaction as the preference.
-- This also captures direct admin/SQL and account-settings changes.
CREATE TABLE IF NOT EXISTS public.email_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK(event_type IN ('subscribed','unsubscribed')),
  source text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_events_member_idx ON public.email_subscription_events(member_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS subscription_events_campaign_idx ON public.email_subscription_events(campaign_id,occurred_at DESC);
ALTER TABLE public.email_subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_subscription_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.email_subscription_events TO service_role;

CREATE OR REPLACE FUNCTION public.record_email_preference_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE campaign uuid; source_name text;
BEGIN
  IF (coalesce(NEW.newsletter_subscribed,true) IS DISTINCT FROM coalesce(OLD.newsletter_subscribed,true))
    OR (NEW.unsubscribed_at IS NOT NULL AND OLD.unsubscribed_at IS NULL) THEN
    campaign := nullif(current_setting('parlor.unsubscribe_campaign',true),'')::uuid;
    source_name := coalesce(nullif(current_setting('parlor.preference_source',true),''),'preferences');
    INSERT INTO public.email_subscription_events(member_id,campaign_id,event_type,source)
    VALUES(NEW.id,campaign,CASE WHEN NEW.newsletter_subscribed IS FALSE OR NEW.unsubscribed_at IS NOT NULL THEN 'unsubscribed' ELSE 'subscribed' END,source_name);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS record_email_preference_change ON public.members;
CREATE TRIGGER record_email_preference_change AFTER UPDATE OF newsletter_subscribed,unsubscribed_at ON public.members
FOR EACH ROW EXECUTE FUNCTION public.record_email_preference_change();
REVOKE ALL ON FUNCTION public.record_email_preference_change() FROM PUBLIC,anon,authenticated;

-- Keep historical opt-outs visible without guessing which campaign caused them.
INSERT INTO public.email_subscription_events(member_id,event_type,source,occurred_at)
SELECT m.id,'unsubscribed','existing_preferences',m.unsubscribed_at FROM public.members m
WHERE m.unsubscribed_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM public.email_subscription_events e WHERE e.member_id=m.id AND e.event_type='unsubscribed');

CREATE OR REPLACE FUNCTION public.unsubscribe_email_member(p_member uuid,p_campaign uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE changed integer;
BEGIN
  -- Attribution comes only from an HMAC-signed campaign/member token.
  IF p_campaign IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.email_campaigns WHERE id=p_campaign) THEN p_campaign:=NULL; END IF;
  PERFORM set_config('parlor.unsubscribe_campaign',coalesce(p_campaign::text,''),true);
  PERFORM set_config('parlor.preference_source','email_link',true);
  UPDATE public.members SET newsletter_subscribed=false,unsubscribed_at=coalesce(unsubscribed_at,now()) WHERE id=p_member;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed>0;
END $$;
REVOKE ALL ON FUNCTION public.unsubscribe_email_member(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_email_member(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.campaign_subscriber_activity(p_campaign uuid,p_offset integer DEFAULT 0,p_filter text DEFAULT 'all')
RETURNS TABLE(member_id uuid,full_name text,email text,newsletter_subscribed boolean,unsubscribed_at timestamptz,accepted_at timestamptz,delivered_at timestamptz,opens bigint,clicks bigint,last_event_at timestamptz,links jsonb,campaign_unsubscribed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
WITH activity AS (
 SELECT d.member_id,m.full_name,m.email,m.newsletter_subscribed,m.unsubscribed_at,d.accepted_at,
   max(e.occurred_at) FILTER(WHERE e.event_type='email.delivered') AS delivered_at,
   count(e.event_id) FILTER(WHERE e.event_type='email.opened') AS opens,
   count(e.event_id) FILTER(WHERE e.event_type='email.clicked') AS clicks,
   max(e.occurred_at) AS last_event_at,
   coalesce((SELECT jsonb_agg(to_jsonb(l)) FROM (
     SELECT e2.link,count(*) AS clicks,max(e2.occurred_at) AS last_clicked_at FROM public.campaign_email_events e2
     WHERE e2.provider_email_id=d.provider_email_id AND e2.event_type='email.clicked' AND e2.link IS NOT NULL
     GROUP BY e2.link ORDER BY max(e2.occurred_at) DESC LIMIT 30
   ) l),'[]'::jsonb) AS links,
   (SELECT max(u.occurred_at) FROM public.email_subscription_events u WHERE u.member_id=d.member_id AND u.campaign_id=p_campaign AND u.event_type='unsubscribed') AS campaign_unsubscribed_at
 FROM public.campaign_email_deliveries d LEFT JOIN public.members m ON m.id=d.member_id
 LEFT JOIN public.campaign_email_events e ON e.provider_email_id=d.provider_email_id
 WHERE d.campaign_id=p_campaign
 GROUP BY d.provider_email_id,d.member_id,m.full_name,m.email,m.newsletter_subscribed,m.unsubscribed_at,d.accepted_at
)
SELECT * FROM activity a WHERE p_filter='all' OR (p_filter='clicked' AND a.clicks>0) OR (p_filter='opened' AND a.opens>0) OR (p_filter='unsubscribed' AND a.campaign_unsubscribed_at IS NOT NULL)
ORDER BY coalesce(a.last_event_at,a.accepted_at) DESC,a.member_id LIMIT 51 OFFSET greatest(0,least(p_offset,100000));
$$;
REVOKE ALL ON FUNCTION public.campaign_subscriber_activity(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_subscriber_activity(uuid,integer,text) TO service_role;
COMMIT;
