
ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS processing_token UUID;


-- 1. Claim a webhook event
CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_processing_token UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_event_id TEXT;
  existing_processed_at TIMESTAMPTZ;
BEGIN
  INSERT INTO public.stripe_webhook_events AS existing (
    stripe_event_id,
    event_type,
    processing_started_at,
    processing_token,
    attempt_count
  )
  VALUES (
    p_event_id,
    p_event_type,
    NOW(),
    p_processing_token,
    1
  )
  ON CONFLICT (stripe_event_id)
  DO UPDATE SET
    processing_started_at = NOW(),
    processing_token = EXCLUDED.processing_token,
    attempt_count = existing.attempt_count + 1,
    last_error = NULL
  WHERE
    existing.processed_at IS NULL
    AND (
      existing.processing_started_at IS NULL
      OR existing.processing_started_at < NOW() - INTERVAL '5 minutes'
    )
  RETURNING stripe_event_id INTO claimed_event_id;

  IF claimed_event_id IS NOT NULL THEN
    RETURN 'claimed';
  END IF;

  SELECT processed_at
  INTO existing_processed_at
  FROM public.stripe_webhook_events
  WHERE stripe_event_id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Webhook event claim failed: event not found';
  END IF;

  IF existing_processed_at IS NOT NULL THEN
    RETURN 'processed';
  END IF;

  RETURN 'busy';
END;
$$;


-- 2. Renew a webhook event claim
CREATE OR REPLACE FUNCTION public.renew_stripe_webhook_event_claim(
  p_event_id TEXT,
  p_processing_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  renewed BOOLEAN;
BEGIN
  UPDATE public.stripe_webhook_events
  SET processing_started_at = NOW()
  WHERE stripe_event_id = p_event_id
    AND processing_token = p_processing_token
    AND processed_at IS NULL
    AND processing_started_at >= NOW() - INTERVAL '5 minutes'
  RETURNING TRUE INTO renewed;

  RETURN COALESCE(renewed, FALSE);
END;
$$;


-- 3. Complete a webhook event
CREATE OR REPLACE FUNCTION public.complete_stripe_webhook_event(
  p_event_id TEXT,
  p_processing_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  completed BOOLEAN;
BEGIN
  UPDATE public.stripe_webhook_events
  SET
    processed_at = NOW(),
    processing_started_at = NULL,
    processing_token = NULL,
    last_error = NULL
  WHERE stripe_event_id = p_event_id
    AND processing_token = p_processing_token
    AND processed_at IS NULL
    AND processing_started_at >= NOW() - INTERVAL '5 minutes'
  RETURNING TRUE INTO completed;

  RETURN COALESCE(completed, FALSE);
END;
$$;


-- 4. Release a failed webhook event claim
CREATE OR REPLACE FUNCTION public.release_stripe_webhook_event_claim(
  p_event_id TEXT,
  p_processing_token UUID,
  p_error TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  released BOOLEAN;
BEGIN
  UPDATE public.stripe_webhook_events
  SET
    processing_started_at = NULL,
    processing_token = NULL,
    last_error = LEFT(p_error, 2000)
  WHERE stripe_event_id = p_event_id
    AND processing_token = p_processing_token
    AND processed_at IS NULL
  RETURNING TRUE INTO released;

  RETURN COALESCE(released, FALSE);
END;
$$;


-- 5. Remove the old two-parameter claim function
DROP FUNCTION IF EXISTS public.claim_stripe_webhook_event(TEXT, TEXT);


-- 6. Restrict execution permissions
REVOKE ALL ON FUNCTION
  public.claim_stripe_webhook_event(TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.renew_stripe_webhook_event_claim(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.complete_stripe_webhook_event(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.release_stripe_webhook_event_claim(TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;


GRANT EXECUTE ON FUNCTION
  public.claim_stripe_webhook_event(TEXT, TEXT, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION
  public.renew_stripe_webhook_event_claim(TEXT, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION
  public.complete_stripe_webhook_event(TEXT, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION
  public.release_stripe_webhook_event_claim(TEXT, UUID, TEXT)
  TO service_role;
