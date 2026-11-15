import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { getStripeClient } from "../../../lib/stripe";

const toIsoDate = (timestamp?: number | null) =>
  timestamp ? new Date(timestamp * 1000).toISOString() : null;

const syncSubscription = async (
  subscription: Stripe.Subscription,
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

  const { error } = await supabaseAdmin.from("billing_subscriptions").upsert(
    {
      stripe_subscription_id: subscription.id,
      user_id: userId,
      stripe_price_id: subscriptionItem.price.id,
      status: subscription.status,
      current_period_start: toIsoDate(subscriptionItem.current_period_start),
      current_period_end: toIsoDate(subscriptionItem.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: toIsoDate(subscription.cancel_at),
      trial_end: toIsoDate(subscription.trial_end),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "stripe_subscription_id",
    },
  );

  if (error) throw error;
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
            const subscription =
              await stripe.subscriptions.retrieve(subscriptionId);

            await syncSubscription(
              subscription,
              session.metadata?.supabase_user_id ?? session.client_reference_id,
            );
          }

          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const eventSubscription = event.data.object as Stripe.Subscription;

          // Retrieve the latest state instead of trusting the event snapshot.
          const subscription = await stripe.subscriptions.retrieve(
            eventSubscription.id,
          );

          await syncSubscription(subscription);
          break;
        }

        default:
          // Other events are acknowledged but do not change billing state.
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
