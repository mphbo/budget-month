GRANT SELECT, INSERT, UPDATE
ON public.stripe_webhook_events
TO service_role;

GRANT SELECT, INSERT, UPDATE
ON public.billing_customers
TO service_role;

GRANT SELECT, INSERT, UPDATE
ON public.billing_subscriptions
TO service_role;