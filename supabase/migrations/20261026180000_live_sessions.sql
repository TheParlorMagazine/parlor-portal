BEGIN;
-- Keep member identities out of the legacy browser-writable active_sessions
-- table. This private feed replaces that source in the live admin UI only.
CREATE TABLE IF NOT EXISTS public.live_site_sessions (
  visitor_id uuid PRIMARY KEY,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  current_page text NOT NULL CHECK(length(current_page)<=500),
  country text CHECK(length(country)<=100),
  region text CHECK(length(region)<=100),
  city text CHECK(length(city)<=100),
  device_type text NOT NULL DEFAULT 'unknown' CHECK(device_type IN ('mobile','tablet','desktop','unknown')),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  recent_pages jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS live_site_sessions_seen_idx ON public.live_site_sessions(last_seen DESC);
ALTER TABLE public.live_site_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_site_sessions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.live_site_sessions TO service_role;
CREATE OR REPLACE FUNCTION public.touch_live_site_session(p_visitor uuid,p_member uuid,p_page text,p_country text,p_region text,p_city text,p_device text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old public.live_site_sessions; history jsonb;
BEGIN
  IF p_visitor IS NULL OR p_page IS NULL OR length(p_page)>500 OR p_page LIKE '%?%' OR p_page LIKE '%#%' OR p_device NOT IN ('mobile','tablet','desktop','unknown') THEN RAISE EXCEPTION 'Invalid session'; END IF;
  -- Serialize creation to keep the cap meaningful under concurrent requests.
  PERFORM pg_advisory_xact_lock(72626180001);
  DELETE FROM public.live_site_sessions WHERE visitor_id IN (SELECT visitor_id FROM public.live_site_sessions WHERE last_seen<now()-interval '10 minutes' ORDER BY last_seen LIMIT 500);
  SELECT * INTO old FROM public.live_site_sessions WHERE visitor_id=p_visitor FOR UPDATE;
  IF NOT FOUND THEN
    IF (SELECT count(*) FROM public.live_site_sessions WHERE last_seen>now()-interval '90 seconds')>=5000 THEN RETURN false; END IF;
    INSERT INTO public.live_site_sessions(visitor_id,member_id,current_page,country,region,city,device_type,recent_pages)
    VALUES(p_visitor,p_member,p_page,p_country,p_region,p_city,p_device,jsonb_build_array(jsonb_build_object('path',p_page,'at',now())));
    RETURN true;
  END IF;
  IF old.member_id IS NOT DISTINCT FROM p_member AND old.current_page=p_page AND old.last_seen>now()-interval '5 seconds' THEN RETURN true; END IF;
  -- Identity transitions clear the previous account's page list (shared devices).
  history:=CASE WHEN old.member_id IS DISTINCT FROM p_member THEN '[]'::jsonb ELSE old.recent_pages END;
  IF old.current_page IS DISTINCT FROM p_page OR old.member_id IS DISTINCT FROM p_member THEN
    history:=history || jsonb_build_array(jsonb_build_object('path',p_page,'at',now()));
    SELECT coalesce(jsonb_agg(item ORDER BY ord),'[]'::jsonb) INTO history FROM jsonb_array_elements(history) WITH ORDINALITY AS e(item,ord) WHERE ord>greatest(0,jsonb_array_length(history)-20);
  END IF;
  UPDATE public.live_site_sessions SET member_id=p_member,current_page=p_page,country=p_country,region=p_region,city=p_city,device_type=p_device,last_seen=now(),recent_pages=history WHERE visitor_id=p_visitor;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.touch_live_site_session(uuid,uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.touch_live_site_session(uuid,uuid,text,text,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.prune_live_site_sessions()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM public.live_site_sessions WHERE last_seen<now()-interval '10 minutes';
$$;
REVOKE ALL ON FUNCTION public.prune_live_site_sessions() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prune_live_site_sessions() TO service_role;
COMMIT;
