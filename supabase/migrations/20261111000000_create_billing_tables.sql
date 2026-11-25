
-- =========================================================
-- Budget Month: Stripe billing infrastructure
-- =========================================================

-- 1. Map Supabase users to Stripe customers
CREATE TABLE public.billing_customers (
    user_id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    stripe_customer_id TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. Store subscription records
CREATE TABLE public.billing_subscriptions (
    stripe_subscription_id TEXT PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    stripe_price_id TEXT NOT NULL,

    status TEXT NOT NULL,

    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,

    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

    trial_end TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX billing_subscriptions_user_id_idx
    ON public.billing_subscriptions(user_id);

CREATE INDEX billing_subscriptions_status_idx
    ON public.billing_subscriptions(status);


-- 3. Track Stripe webhook events
CREATE TABLE public.stripe_webhook_events (
    stripe_event_id TEXT PRIMARY KEY,

    event_type TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    processed_at TIMESTAMPTZ
);


-- =========================================================
-- Row Level Security
-- =========================================================

ALTER TABLE public.billing_customers
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.billing_subscriptions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stripe_webhook_events
    ENABLE ROW LEVEL SECURITY;


-- Users can read their own Stripe customer mapping
CREATE POLICY "Users can view their own billing customer"
    ON public.billing_customers
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);


-- Users can read their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
    ON public.billing_subscriptions
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- No client-facing policies for webhook events.
-- Webhook processing will use trusted server-side access.
