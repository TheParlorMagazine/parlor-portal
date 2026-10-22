CREATE TABLE IF NOT EXISTS public.event_reminder_deliveries (
  event_id uuid NOT NULL,
  member_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'accepted', 'failed', 'uncertain')),
  resend_email_id text,
  notified_at timestamptz,
  attempts integer NOT NULL DEFAULT 1,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id),
  FOREIGN KEY (event_id, member_id)
    REFERENCES public.event_rsvps(event_id, member_id)
    ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION public.claim_event_reminder(
  p_event_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  INSERT INTO public.event_reminder_deliveries (
    event_id, member_id
  )
  SELECT p_event_id, p_member_id
  WHERE EXISTS (
    SELECT 1
    FROM public.event_rsvps
    WHERE event_id = p_event_id
      AND member_id = p_member_id
      AND status = 'going'
      AND reminded_at IS NULL
  )
  ON CONFLICT (event_id, member_id)
  DO UPDATE SET
    status = 'sending',
    attempts = event_reminder_deliveries.attempts + 1,
    claimed_at = now(),
    updated_at = now()
  WHERE event_reminder_deliveries.status = 'failed'
    AND EXISTS (
      SELECT 1
      FROM public.event_rsvps r
      WHERE r.event_id = p_event_id
        AND r.member_id = p_member_id
        AND r.status = 'going'
        AND r.reminded_at IS NULL
    )
  RETURNING true INTO claimed;

  RETURN COALESCE(claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_event_reminder(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_event_reminder(uuid, uuid)
TO service_role;

ALTER TABLE public.event_reminder_deliveries
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_reminder_deliveries
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON TABLE public.event_reminder_deliveries
TO service_role;


-- Preserve the notification claim function used by the reminder cron.
-- Claim once per attendee/event to prevent duplicate in-app notifications.
ALTER TABLE public.event_reminder_deliveries
ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_event_reminder_notification(
  p_event_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  UPDATE public.event_reminder_deliveries
  SET notified_at = now(), updated_at = now()
  WHERE event_id = p_event_id
    AND member_id = p_member_id
    AND notified_at IS NULL
  RETURNING true INTO claimed;

  RETURN COALESCE(claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_event_reminder_notification(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_event_reminder_notification(uuid, uuid)
TO service_role;
