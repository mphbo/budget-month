import { NextResponse } from "next/server";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { disconnectPlaidItemsForUser } from "@/app/lib/plaid/disconnect";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getStripeClient } from "@/app/lib/stripe";

const toIsoDate = (timestamp?: number | null) =>
  timestamp ? new Date(timestamp * 1000).toISOString() : null;

const syncSubscription = async (
  subscription: Stripe.Subscription,
  lockToken: string,
  fallbackUserId?: string | null,
) => {
  const supabaseAdmin = createSupabaseAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let userId = subscription.metadata?.supabase_user_id || fallbackUserId;

  if (!userId) {
    const { data: customer, error } = await supabaseAdmin
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (error) throw error;

    userId = customer?.user_id;
  }

  if (!userId) {
    throw new Error(
      `No Supabase user found for Stripe subscription ${subscription.id}.`,
    );
  }

  const subscriptionItem = subscription.items.data[0] as
    | {
        price: { id: string };
        current_period_start?: number;
        current_period_end?: number;
      }
    | undefined;

  if (!subscriptionItem) {
    throw new Error(
      `Subscription ${subscription.id} has no subscription items.`,
    );
  }

  const { error } = await supabaseAdmin.rpc("sync_stripe_subscription", {
    p_subscription_id: subscription.id,
    p_lock_token: lockToken,
    p_user_id: userId,
    p_price_id: subscriptionItem.price.id,
    p_status: subscription.status,
    p_current_period_start: toIsoDate(subscriptionItem.current_period_start),
    p_current_period_end: toIsoDate(subscriptionItem.current_period_end),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
    p_cancel_at: toIsoDate(subscription.cancel_at),
    p_trial_end: toIsoDate(subscription.trial_end),
  });

  if (error) throw error;
  return userId;
};

const disconnectPlaidItemsIfNoActiveSubscription = async (userId: string) => {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: activeSubscription, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  // Another qualifying subscription still exists.
  if (activeSubscription) return;

  await disconnectPlaidItemsForUser(userId);
};

const withSubscriptionLock = async <T>(
  subscriptionId: string,
  callback: (lockToken: string, ensureLock: () => Promise<void>) => Promise<T>,
): Promise<T> => {
  const supabaseAdmin = createSupabaseAdminClient();
  const lockToken = randomUUID();

  const { data: acquired, error: acquireError } = await supabaseAdmin.rpc(
    "acquire_stripe_subscription_lock",
    {
      p_subscription_id: subscriptionId,
      p_lock_token: lockToken,
    },
  );

  if (acquireError) throw acquireError;

  if (!acquired) {
    throw new Error(
      `Subscription ${subscriptionId} is currently being processed.`,
    );
  }

  let renewalError: Error | null = null;
  let renewalInProgress = false;

  const ensureLock = async () => {
    if (renewalError) throw renewalError;

    const { data: renewed, error } = await supabaseAdmin.rpc(
      "renew_stripe_subscription_lock",
      {
        p_subscription_id: subscriptionId,
        p_lock_token: lockToken,
      },
    );

    if (error) {
      renewalError = error;
      throw error;
    }

    if (!renewed) {
      renewalError = new Error(`Lost subscription lock for ${subscriptionId}.`);
      throw renewalError;
    }
  };

  const renewalInterval = setInterval(async () => {
    if (renewalInProgress || renewalError) return;

    renewalInProgress = true;

    try {
      await ensureLock();
    } catch (error) {
      renewalError =
        error instanceof Error
          ? error
          : new Error("Unknown subscription lock renewal error.");

      console.error(
        `Subscription lock renewal failed for ${subscriptionId}:`,
        renewalError,
      );
    } finally {
      renewalInProgress = false;
    }
  }, 60_000);

  try {
    return await callback(lockToken, ensureLock);
  } finally {
    clearInterval(renewalInterval);

    const { error: releaseError } = await supabaseAdmin.rpc(
      "release_stripe_subscription_lock",
      {
        p_subscription_id: subscriptionId,
        p_lock_token: lockToken,
      },
    );

    if (releaseError) {
      console.error(
        `Failed to release subscription lock for ${subscriptionId}:`,
        releaseError,
      );
    }
  }
};

const withUserLock = async <T>(
  userId: string,
  callback: (ensureLock: () => Promise<void>) => Promise<T>,
): Promise<T> => {
  const supabaseAdmin = createSupabaseAdminClient();
  const lockToken = randomUUID();

  const { data: acquired, error: acquireError } = await supabaseAdmin.rpc(
    "acquire_stripe_user_lock",
    {
      p_user_id: userId,
      p_lock_token: lockToken,
    },
  );

  if (acquireError) throw acquireError;

  if (!acquired) {
    throw new Error(
      `Subscription processing is already running for user ${userId}.`,
    );
  }

  let renewalError: Error | null = null;
  let renewalInProgress = false;

  const ensureLock = async () => {
    if (renewalError) throw renewalError;

    const { data: renewed, error } = await supabaseAdmin.rpc(
      "renew_stripe_user_lock",
      {
        p_user_id: userId,
        p_lock_token: lockToken,
      },
    );

    if (error) {
      renewalError = error;
      throw error;
    }

    if (!renewed) {
      renewalError = new Error(`Lost user lock for ${userId}.`);
      throw renewalError;
    }
  };

  const renewalInterval = setInterval(async () => {
    if (renewalInProgress || renewalError) return;

    renewalInProgress = true;

    try {
      await ensureLock();
    } catch (error) {
      renewalError =
        error instanceof Error
          ? error
          : new Error("Unknown user lock renewal error.");

      console.error(`User lock renewal failed for ${userId}:`, renewalError);
    } finally {
      renewalInProgress = false;
    }
  }, 60_000);

  try {
    return await callback(ensureLock);
  } finally {
    clearInterval(renewalInterval);

    const { error: releaseError } = await supabaseAdmin.rpc(
      "release_stripe_user_lock",
      {
        p_user_id: userId,
        p_lock_token: lockToken,
      },
    );

    if (releaseError) {
      console.error(`Failed to release user lock for ${userId}:`, releaseError);
    }
  }
};

export const POST = async (request: Request) => {
  try {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = request.headers.get("stripe-signature");

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured.");

      return NextResponse.json(
        { error: "Webhook is not configured." },
        { status: 500 },
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature." },
        { status: 400 },
      );
    }

    // Stripe signature verification requires the unmodified request body.
    const payload = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error);

      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Atomically claim this event so concurrent deliveries cannot
    // process the same event at the same time.
    const { data: claimStatus, error: claimError } = await supabaseAdmin.rpc(
      "claim_stripe_webhook_event",
      {
        p_event_id: event.id,
        p_event_type: event.type,
      },
    );

    if (claimError) {
      throw claimError;
    }

    if (claimStatus === "processed") {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    if (claimStatus === "busy") {
      // Another request currently owns the processing lease.
      // Return 500 so Stripe retries instead of acknowledging prematurely.
      return NextResponse.json(
        { error: "Webhook event is currently being processed." },
        { status: 500 },
      );
    }

    if (claimStatus !== "claimed") {
      throw new Error(
        `Unexpected webhook claim status: ${String(claimStatus)}`,
      );
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;

          if (subscriptionId) {
            await withSubscriptionLock(
              subscriptionId,
              async (lockToken, ensureLock) => {
                const subscription =
                  await stripe.subscriptions.retrieve(subscriptionId);

                await ensureLock();

                await syncSubscription(
                  subscription,
                  lockToken,
                  session.metadata?.supabase_user_id ??
                    session.client_reference_id,
                );
              },
            );
          }

          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const eventSubscription = event.data.object as Stripe.Subscription;

          const { userId, status } = await withSubscriptionLock(
            eventSubscription.id,
            async (lockToken, ensureLock) => {
              // Retrieve the latest state only after acquiring the lock.
              const subscription = await stripe.subscriptions.retrieve(
                eventSubscription.id,
              );

              await ensureLock();

              const userId = await syncSubscription(subscription, lockToken);

              return {
                userId,
                status: subscription.status,
              };
            },
          );

          await disconnectPlaidItemsIfNoActiveSubscription(userId);

          break;
        }

        default:
          break;
      }

      // Only mark the event processed after all handling succeeds.
      const { error: updateError } = await supabaseAdmin
        .from("stripe_webhook_events")
        .update({
          processed_at: new Date().toISOString(),
          processing_started_at: null,
          last_error: null,
        })
        .eq("stripe_event_id", event.id);

      if (updateError) throw updateError;

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook processing failed:", error);

      // Release the lease so Stripe's retry can claim the event immediately.
      const errorMessage =
        error instanceof Error
          ? error.message.slice(0, 2000)
          : "Unknown webhook processing error.";

      const { error: releaseError } = await supabaseAdmin
        .from("stripe_webhook_events")
        .update({
          processing_started_at: null,
          last_error: errorMessage,
        })
        .eq("stripe_event_id", event.id);

      if (releaseError) {
        console.error(
          "Could not release Stripe webhook processing lease:",
          releaseError,
        );
      }

      return NextResponse.json(
        { error: "Webhook processing failed." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Stripe webhook request failed:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
};
