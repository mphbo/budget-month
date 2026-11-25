
-- Track webhook processing state and retry attempts.
ALTER TABLE public.stripe_webhook_events
    ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processing_idx
    ON public.stripe_webhook_events (processing_started_at)
    WHERE processed_at IS NULL;


-- Atomically claim an event for processing.
-- Returns:
--   claimed   - this request owns processing
--   processed - event was already completed
--   busy      - another request currently owns processing

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
    p_event_id TEXT,
    p_event_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claimed_event_id TEXT;
    existing_processed_at TIMESTAMPTZ;
BEGIN
    INSERT INTO public.stripe_webhook_events (
        stripe_event_id,
        event_type,
        processing_started_at,
        attempt_count
    )
    VALUES (
        p_event_id,
        p_event_type,
        NOW(),
        1
    )
    ON CONFLICT (stripe_event_id)
    DO UPDATE SET
        processing_started_at = NOW(),
        attempt_count = stripe_webhook_events.attempt_count + 1,
        last_error = NULL
    WHERE
        stripe_webhook_events.processed_at IS NULL
        AND (
            stripe_webhook_events.processing_started_at IS NULL
            OR stripe_webhook_events.processing_started_at
                < NOW() - INTERVAL '5 minutes'
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


-- Only the trusted server-side role can claim webhook events.
REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT)
    TO service_role;
