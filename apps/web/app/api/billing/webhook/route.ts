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

const disconnectPlaidItemsIfNoActiveSubscription = async (
  stripe: Stripe,
  userId: string,
  customerId: string,
  ensureLock: () => Promise<void>,
) => {
  let startingAfter: string | undefined;

  while (true) {
    await ensureLock();

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    const hasActiveSubscription = subscriptions.data.some(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trialing",
    );

    if (hasActiveSubscription) {
      return;
    }

    if (!subscriptions.has_more) {
      break;
    }

    const lastSubscription = subscriptions.data[subscriptions.data.length - 1];

    if (!lastSubscription) {
      throw new Error(
        `Stripe returned an empty subscription page for customer ${customerId}.`,
      );
    }

    startingAfter = lastSubscription.id;
  }

  await ensureLock();

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
  let renewalPromise: Promise<void> | null = null;

  const renewLock = async () => {
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

  const ensureLock = async () => {
    if (renewalPromise) {
      await renewalPromise;
    } else {
      await renewLock();
    }

    if (renewalError) throw renewalError;
  };

  const renewalInterval = setInterval(() => {
    if (renewalInProgress || renewalError) return;

    renewalInProgress = true;

    renewalPromise = (async () => {
      try {
        await renewLock();
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
        renewalPromise = null;
      }
    })();
  }, 60_000);

  try {
    const result = await callback(lockToken, ensureLock);

    await ensureLock();

    return result;
  } finally {
    clearInterval(renewalInterval);

    if (renewalPromise) {
      await renewalPromise;
    }

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
  let renewalPromise: Promise<void> | null = null;

  const renewLock = async () => {
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

  const ensureLock = async () => {
    if (renewalPromise) {
      await renewalPromise;
    } else {
      await renewLock();
    }

    if (renewalError) throw renewalError;
  };

  const renewalInterval = setInterval(() => {
    if (renewalInProgress || renewalError) return;

    renewalInProgress = true;

    renewalPromise = (async () => {
      try {
        await renewLock();
      } catch (error) {
        renewalError =
          error instanceof Error
            ? error
            : new Error("Unknown user lock renewal error.");

        console.error(`User lock renewal failed for ${userId}:`, renewalError);
      } finally {
        renewalInProgress = false;
        renewalPromise = null;
      }
    })();
  }, 60_000);

  try {
    const result = await callback(ensureLock);

    await ensureLock();

    return result;
  } finally {
    clearInterval(renewalInterval);

    if (renewalPromise) {
      await renewalPromise;
    }

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

const withWebhookEventLease = async <T>(
  eventId: string,
  processingToken: string,
  callback: () => Promise<T>,
): Promise<T> => {
  const supabaseAdmin = createSupabaseAdminClient();

  let renewalError: Error | null = null;
  let renewalInProgress = false;
  let renewalPromise: Promise<void> | null = null;

  const renewLease = async () => {
    if (renewalError) throw renewalError;

    const { data: renewed, error } = await supabaseAdmin.rpc(
      "renew_stripe_webhook_event_claim",
      {
        p_event_id: eventId,
        p_processing_token: processingToken,
      },
    );

    if (error) {
      renewalError = error;
      throw error;
    }

    if (!renewed) {
      renewalError = new Error(`Lost webhook event claim for ${eventId}.`);
      throw renewalError;
    }
  };

  const ensureLease = async () => {
    if (renewalPromise) {
      await renewalPromise;
    } else {
      await renewLease();
    }

    if (renewalError) throw renewalError;
  };

  const renewalInterval = setInterval(() => {
    if (renewalInProgress || renewalError) return;

    renewalInProgress = true;

    renewalPromise = (async () => {
      try {
        await renewLease();
      } catch (error) {
        renewalError =
          error instanceof Error
            ? error
            : new Error("Unknown webhook event lease renewal error.");

        console.error(
          `Webhook event lease renewal failed for ${eventId}:`,
          renewalError,
        );
      } finally {
        renewalInProgress = false;
        renewalPromise = null;
      }
    })();
  }, 60_000);

  try {
    const result = await callback();

    await ensureLease();

    return result;
  } finally {
    clearInterval(renewalInterval);

    if (renewalPromise) {
      await renewalPromise;
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
    const processingToken = randomUUID();

    const { data: claimStatus, error: claimError } = await supabaseAdmin.rpc(
      "claim_stripe_webhook_event",
      {
        p_event_id: event.id,
        p_event_type: event.type,
        p_processing_token: processingToken,
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
      await withWebhookEventLease(event.id, processingToken, async () => {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            const subscriptionId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id;

            if (subscriptionId) {
              const { userId, customerId } = await withSubscriptionLock(
                subscriptionId,
                async (lockToken, ensureLock) => {
                  const subscription =
                    await stripe.subscriptions.retrieve(subscriptionId);

                  await ensureLock();

                  const userId = await syncSubscription(
                    subscription,
                    lockToken,
                    session.metadata?.supabase_user_id ??
                      session.client_reference_id,
                  );

                  const customerId =
                    typeof subscription.customer === "string"
                      ? subscription.customer
                      : subscription.customer.id;

                  return { userId, customerId };
                },
              );

              await withUserLock(userId, async (ensureLock) => {
                await disconnectPlaidItemsIfNoActiveSubscription(
                  stripe,
                  userId,
                  customerId,
                  ensureLock,
                );
              });
            }

            break;
          }

          case "customer.subscription.created":
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            const eventSubscription = event.data.object as Stripe.Subscription;

            const { userId, customerId } = await withSubscriptionLock(
              eventSubscription.id,
              async (lockToken, ensureLock) => {
                const subscription = await stripe.subscriptions.retrieve(
                  eventSubscription.id,
                );

                await ensureLock();

                const userId = await syncSubscription(subscription, lockToken);

                const customerId =
                  typeof subscription.customer === "string"
                    ? subscription.customer
                    : subscription.customer.id;

                return { userId, customerId };
              },
            );

            await withUserLock(userId, async (ensureLock) => {
              await disconnectPlaidItemsIfNoActiveSubscription(
                stripe,
                userId,
                customerId,
                ensureLock,
              );
            });

            break;
          }

          default:
            break;
        }
      });

      // Complete the event only after processing and lease verification succeed.
      const { data: completed, error: completeError } = await supabaseAdmin.rpc(
        "complete_stripe_webhook_event",
        {
          p_event_id: event.id,
          p_processing_token: processingToken,
        },
      );

      if (completeError) throw completeError;

      if (!completed) {
        throw new Error(
          `Could not complete webhook event ${event.id}: claim lost.`,
        );
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook processing failed:", error);

      // Release the lease so Stripe's retry can claim the event immediately.
      const errorMessage =
        error instanceof Error
          ? error.message.slice(0, 2000)
          : "Unknown webhook processing error.";

      const { data: released, error: releaseError } = await supabaseAdmin.rpc(
        "release_stripe_webhook_event_claim",
        {
          p_event_id: event.id,
          p_processing_token: processingToken,
          p_error: errorMessage,
        },
      );

      if (releaseError) {
        console.error(
          "Could not release Stripe webhook processing lease:",
          releaseError,
        );
      } else if (!released) {
        console.warn(
          `Stripe webhook event ${event.id} was not released because this request no longer owns its claim.`,
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
