BEGIN;
CREATE TABLE IF NOT EXISTS public.member_paid_plan_history (
 member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
 plan_key text NOT NULL CHECK (plan_key IN ('circle','press')),
 started_at timestamptz,
 ended_at timestamptz,
 source text NOT NULL DEFAULT 'membership_change',
 PRIMARY KEY(member_id,plan_key)
);
ALTER TABLE public.member_paid_plan_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_paid_plan_history FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.member_paid_plan_history TO service_role;
CREATE OR REPLACE FUNCTION public.paid_plan_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN lower(value) IN ('reader''s circle','readers_circle','circle','readers-circle') THEN 'circle'
 WHEN lower(value) IN ('printing press','printing_press','press','print') THEN 'press' END;
$$;
CREATE OR REPLACE FUNCTION public.remember_paid_plan() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous_key text; current_key text:=public.paid_plan_key(NEW.plan); ended boolean:=coalesce(to_jsonb(NEW)->>'subscription_status','active') IN ('churned','cancelled','canceled','expired','unpaid','incomplete_expired');
BEGIN
 IF TG_OP='UPDATE' THEN
  previous_key:=public.paid_plan_key(OLD.plan);
  IF previous_key IS NOT NULL AND (previous_key IS DISTINCT FROM current_key OR ended) THEN
   INSERT INTO public.member_paid_plan_history(member_id,plan_key,started_at,ended_at)
   VALUES(NEW.id,previous_key,(to_jsonb(OLD)->>'joined_at')::timestamptz,now())
   ON CONFLICT(member_id,plan_key) DO UPDATE SET ended_at=coalesce(public.member_paid_plan_history.ended_at,EXCLUDED.ended_at);
  END IF;
 END IF;
 IF current_key IS NOT NULL THEN
  INSERT INTO public.member_paid_plan_history(member_id,plan_key,started_at,ended_at)
  VALUES(NEW.id,current_key,(to_jsonb(NEW)->>'joined_at')::timestamptz,CASE WHEN ended THEN now() END)
  ON CONFLICT(member_id,plan_key) DO UPDATE SET ended_at=CASE WHEN ended THEN coalesce(public.member_paid_plan_history.ended_at,EXCLUDED.ended_at) END;
 END IF;
 -- Ending paid access is churn regardless of who initiated the cancellation.
 -- Newsletter consent and newsletter delivery remain independent.
 IF TG_OP='UPDATE' AND previous_key IS NOT NULL AND current_key IS NULL THEN
  NEW.subscription_status:='churned';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.remember_paid_plan() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS remember_paid_plan ON public.members;
-- AFTER INSERT has a valid member FK; BEFORE UPDATE captures the old plan and
-- saves churn status atomically with the access change.
CREATE TRIGGER remember_paid_plan BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.remember_paid_plan();
DROP TRIGGER IF EXISTS remember_paid_plan_insert ON public.members;
CREATE TRIGGER remember_paid_plan_insert AFTER INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.remember_paid_plan();
INSERT INTO public.member_paid_plan_history(member_id,plan_key,started_at,ended_at,source)
SELECT id,public.paid_plan_key(plan),(to_jsonb(m)->>'joined_at')::timestamptz,
 CASE WHEN to_jsonb(m)->>'subscription_status' IN ('churned','cancelled','canceled','expired','unpaid','incomplete_expired') THEN now() END,'existing_membership'
FROM public.members m WHERE public.paid_plan_key(plan) IS NOT NULL
ON CONFLICT DO NOTHING;
COMMIT;
