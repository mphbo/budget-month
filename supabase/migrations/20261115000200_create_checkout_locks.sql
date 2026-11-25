
-- Stores one active checkout lock per user.
CREATE TABLE public.checkout_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_token UUID NOT NULL,
  locked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.checkout_locks ENABLE ROW LEVEL SECURITY;

-- Only the server-side service role can access checkout locks.
REVOKE ALL ON public.checkout_locks
FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.checkout_locks TO service_role;


-- Atomically acquire a five-minute checkout lock.
CREATE OR REPLACE FUNCTION public.claim_checkout_lock(
  p_user_id UUID,
  p_lock_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_user UUID;
BEGIN
  INSERT INTO public.checkout_locks AS existing (
    user_id,
    lock_token,
    locked_until
  )
  VALUES (
    p_user_id,
    p_lock_token,
    NOW() + INTERVAL '5 minutes'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    lock_token = EXCLUDED.lock_token,
    locked_until = EXCLUDED.locked_until
  WHERE existing.locked_until <= NOW()
  RETURNING user_id INTO claimed_user;

  RETURN claimed_user IS NOT NULL;
END;
$$;


-- Release only the lock owned by the supplied token.
CREATE OR REPLACE FUNCTION public.release_checkout_lock(
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
  DELETE FROM public.checkout_locks
  WHERE user_id = p_user_id
    AND lock_token = p_lock_token
  RETURNING TRUE INTO released;

  RETURN COALESCE(released, FALSE);
END;
$$;


-- Restrict RPC execution to the server-side service role.
REVOKE ALL ON FUNCTION public.claim_checkout_lock(UUID, UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.release_checkout_lock(UUID, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_checkout_lock(UUID, UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION public.release_checkout_lock(UUID, UUID)
TO service_role;
