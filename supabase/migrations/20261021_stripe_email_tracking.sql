-- Track Stripe-triggered emails independently of payment processing.
-- A unique event/type/recipient combination prevents duplicate claims.

CREATE TABLE IF NOT EXISTS public.stripe_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  email_type text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'accepted', 'failed', 'uncertain')),
  resend_email_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_event_id, email_type, recipient)
);

-- Claim a notification atomically before attempting delivery.
-- An existing claim is never automatically reused: this avoids
-- duplicate emails when the outcome of a previous attempt is unknown.

CREATE OR REPLACE FUNCTION public.claim_stripe_email(
  p_event_id text,
  p_email_type text,
  p_recipient text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  INSERT INTO public.stripe_email_deliveries (
    stripe_event_id,
    email_type,
    recipient
  )
  VALUES (
    p_event_id,
    p_email_type,
    lower(trim(p_recipient))
  )
  ON CONFLICT (stripe_event_id, email_type, recipient)
  DO NOTHING
  RETURNING id INTO claimed_id;

  RETURN claimed_id IS NOT NULL;
END;
$$;

-- Only the backend service role should execute the claim function.
REVOKE ALL ON FUNCTION public.claim_stripe_email(text, text, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_email(text, text, text)
TO service_role;

-- Prevent direct access to delivery records from client-side roles.
ALTER TABLE public.stripe_email_deliveries ENABLE ROW LEVEL SECURITY;

-- Only the backend service role can read or modify delivery records.
REVOKE ALL ON TABLE public.stripe_email_deliveries
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON TABLE public.stripe_email_deliveries
TO service_role;
