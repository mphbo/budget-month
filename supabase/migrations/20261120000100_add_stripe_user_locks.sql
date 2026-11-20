
CREATE TABLE public.stripe_user_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_token UUID NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_user_locks
  ENABLE ROW LEVEL SECURITY;

-- Acquire a lock for one user's subscription processing.
CREATE OR REPLACE FUNCTION public.acquire_stripe_user_lock(
  p_user_id UUID,
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
  INSERT INTO public.stripe_user_locks (
    user_id,
    lock_token,
    locked_at
  )
  VALUES (
    p_user_id,
    p_lock_token,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    lock_token = EXCLUDED.lock_token,
    locked_at = NOW()
  WHERE
    public.stripe_user_locks.locked_at < NOW() - INTERVAL '5 minutes'
  RETURNING TRUE INTO acquired;

  RETURN COALESCE(acquired, FALSE);
END;
$$;

-- Renew an existing lock.
CREATE OR REPLACE FUNCTION public.renew_stripe_user_lock(
  p_user_id UUID,
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
  UPDATE public.stripe_user_locks
  SET locked_at = NOW()
  WHERE user_id = p_user_id
    AND lock_token = p_lock_token
    AND locked_at >= NOW() - INTERVAL '5 minutes'
  RETURNING TRUE INTO renewed;

  RETURN COALESCE(renewed, FALSE);
END;
$$;

-- Release only the lock owned by the caller.
CREATE OR REPLACE FUNCTION public.release_stripe_user_lock(
  p_user_id UUID,
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
  DELETE FROM public.stripe_user_locks
  WHERE user_id = p_user_id
    AND lock_token = p_lock_token
  RETURNING TRUE INTO released;

  RETURN COALESCE(released, FALSE);
END;
$$;

-- Only the trusted server-side role can manage these locks.
REVOKE ALL ON TABLE public.stripe_user_locks
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.acquire_stripe_user_lock(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.renew_stripe_user_lock(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.release_stripe_user_lock(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.acquire_stripe_user_lock(UUID, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION
  public.renew_stripe_user_lock(UUID, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION
  public.release_stripe_user_lock(UUID, UUID)
  TO service_role;
