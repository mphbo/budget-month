CREATE TABLE public.stripe_subscription_locks (
  stripe_subscription_id TEXT PRIMARY KEY,
  lock_token UUID NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_subscription_locks
ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acquire_stripe_subscription_lock(
  p_subscription_id TEXT,
  p_lock_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  acquired BOOLEAN;
BEGIN
  INSERT INTO public.stripe_subscription_locks (
    stripe_subscription_id,
    lock_token,
    locked_at
  )
  VALUES (
    p_subscription_id,
    p_lock_token,
    NOW()
  )
  ON CONFLICT (stripe_subscription_id)
  DO UPDATE SET
    lock_token = EXCLUDED.lock_token,
    locked_at = NOW()
  WHERE
    stripe_subscription_locks.locked_at < NOW() - INTERVAL '5 minutes'
  RETURNING TRUE INTO acquired;

  RETURN COALESCE(acquired, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_stripe_subscription_lock(
  p_subscription_id TEXT,
  p_lock_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  released BOOLEAN;
BEGIN
  DELETE FROM public.stripe_subscription_locks
  WHERE stripe_subscription_id = p_subscription_id
    AND lock_token = p_lock_token
  RETURNING TRUE INTO released;

  RETURN COALESCE(released, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_stripe_subscription_lock(
  p_subscription_id TEXT,
  p_lock_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  renewed BOOLEAN;
BEGIN
  UPDATE public.stripe_subscription_locks
  SET locked_at = NOW()
  WHERE stripe_subscription_id = p_subscription_id
    AND lock_token = p_lock_token
    AND locked_at >= NOW() - INTERVAL '5 minutes'
  RETURNING TRUE INTO renewed;

  RETURN COALESCE(renewed, FALSE);
END;
$$;

REVOKE ALL ON TABLE public.stripe_subscription_locks
FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.acquire_stripe_subscription_lock(TEXT, UUID)
FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.renew_stripe_subscription_lock(TEXT, UUID)
FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.release_stripe_subscription_lock(TEXT, UUID)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.acquire_stripe_subscription_lock(TEXT, UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION
  public.renew_stripe_subscription_lock(TEXT, UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION
  public.release_stripe_subscription_lock(TEXT, UUID)
TO service_role;

CREATE OR REPLACE FUNCTION public.sync_stripe_subscription(
  p_subscription_id TEXT,
  p_lock_token UUID,
  p_user_id UUID,
  p_price_id TEXT,
  p_status TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN,
  p_cancel_at TIMESTAMPTZ,
  p_trial_end TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM public.stripe_subscription_locks
  WHERE stripe_subscription_id = p_subscription_id
    AND lock_token = p_lock_token
    AND locked_at >= NOW() - INTERVAL '5 minutes'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription lock is missing, expired, or no longer owned.';
  END IF;

  INSERT INTO public.billing_subscriptions (
    stripe_subscription_id,
    user_id,
    stripe_price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    cancel_at,
    trial_end,
    updated_at
  )
  VALUES (
    p_subscription_id,
    p_user_id,
    p_price_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_cancel_at,
    p_trial_end,
    NOW()
  )
  ON CONFLICT (stripe_subscription_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    stripe_price_id = EXCLUDED.stripe_price_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    cancel_at = EXCLUDED.cancel_at,
    trial_end = EXCLUDED.trial_end,
    updated_at = NOW();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_stripe_subscription(
  TEXT, UUID, UUID, TEXT, TEXT,
  TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN,
  TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.sync_stripe_subscription(
  TEXT, UUID, UUID, TEXT, TEXT,
  TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN,
  TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;