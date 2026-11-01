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
REVOKE ALL ON public.campaign_email_deliveries,public.campaign_email_events FROM anon,authenticated;
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
COMMIT;
