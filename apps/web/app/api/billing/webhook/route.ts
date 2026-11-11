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

  // Fall back to the customer mapping if metadata is unavailable.
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

  try {
    // Record the event before processing it.
    const { error: insertError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
      });

    if (insertError && insertError.code !== "23505") {
      throw insertError;
    }

    if (insertError?.code === "23505") {
      // A previously processed event needs no further work.
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from("stripe_webhook_events")
        .select("processed_at")
        .eq("stripe_event_id", event.id)
        .single();

      if (lookupError) throw lookupError;

      if (existing.processed_at) {
        return NextResponse.json({ received: true });
      }

      // If processing previously failed, continue and retry it.
    }

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
        const subscription = event.data.object as Stripe.Subscription;

        await syncSubscription(subscription);
        break;
      }

      default:
        // Other events are acknowledged but do not change billing state.
        break;
    }

    // Mark the event processed only after successful handling.
    const { error: updateError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    if (updateError) throw updateError;

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);

    // A 500 response tells Stripe to retry delivery.
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
};
