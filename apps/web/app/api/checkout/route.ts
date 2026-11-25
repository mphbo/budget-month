import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getAuthorizedSupabaseClient } from "@/app/lib/budgets";
import { getOrCreateStripeCustomer } from "@/app/lib/billing/customer";
import { getStripeClient } from "@/app/lib/stripe";

type BillingPlan = "monthly" | "annual";

export const POST = async (request: Request) => {
  const body: unknown = await request.json().catch(() => null);

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("plan" in body) ||
    (body.plan !== "monthly" && body.plan !== "annual")
  ) {
    return NextResponse.json(
      { error: "Choose a valid subscription plan." },
      { status: 400 },
    );
  }

  if (
    !("requestId" in body) ||
    typeof body.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.requestId,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid checkout request ID." },
      { status: 400 },
    );
  }

  const requestId = body.requestId;

  const plan = body.plan as BillingPlan;

  const priceId =
    plan === "monthly"
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_ANNUAL;

  if (!priceId) {
    return NextResponse.json(
      { error: "The selected subscription plan is not configured." },
      { status: 503 },
    );
  }

  // Authenticate using the existing Supabase session.
  const { supabase, userId } = await getAuthorizedSupabaseClient();

  let checkoutLockToken: string | null = null;
  let checkoutLockAcquired = false;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    // Acquire an atomic checkout lock for this user.
    const supabaseAdmin = createSupabaseAdminClient();

    checkoutLockToken = randomUUID();

    const { data: lockAcquired, error: lockError } = await supabaseAdmin.rpc(
      "claim_checkout_lock",
      {
        p_user_id: userId,
        p_lock_token: checkoutLockToken,
      },
    );

    if (lockError) {
      console.error("Could not acquire checkout lock:", lockError);

      return NextResponse.json(
        { error: "Could not start checkout. Please try again." },
        { status: 500 },
      );
    }

    if (!lockAcquired) {
      return NextResponse.json(
        {
          error:
            "Another checkout attempt is already in progress. Please try again shortly.",
          code: "CHECKOUT_IN_PROGRESS",
        },
        { status: 409 },
      );
    }

    checkoutLockAcquired = true;

    // Prevent users with an existing subscription from creating another one.
    const { data: existingSubscription, error: subscriptionError } =
      await supabase
        .from("billing_subscriptions")
        .select("stripe_subscription_id, status")
        .eq("user_id", userId)
        .in("status", [
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "incomplete",
          "paused",
        ])
        .limit(1)
        .maybeSingle();

    // Fail closed if subscription status cannot be verified.
    if (subscriptionError) {
      console.error(
        "Could not verify existing subscription:",
        subscriptionError,
      );

      return NextResponse.json(
        { error: "Could not verify your subscription. Please try again." },
        { status: 500 },
      );
    }

    if (existingSubscription) {
      return NextResponse.json(
        {
          error:
            "You already have a subscription. Manage it from your account.",
          code: "SUBSCRIPTION_EXISTS",
        },
        { status: 409 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(userId, user.email);

    const siteOrigin = new URL(process.env.SITE_URL ?? "http://localhost:3000")
      .origin;

    const stripe = getStripeClient();

    // Independently verify Stripe has no existing subscription.
    // This protects against duplicate subscriptions if webhooks are delayed
    // or have temporarily failed.

    let stripeSubscriptions;

    try {
      const result = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });

      if (result.has_more) {
        return NextResponse.json(
          { error: "Could not verify your subscription. Please try again." },
          { status: 503 },
        );
      }

      stripeSubscriptions = result.data;
    } catch (error) {
      console.error("Could not verify Stripe subscriptions:", error);

      return NextResponse.json(
        { error: "Could not verify your subscription. Please try again." },
        { status: 503 },
      );
    }

    const existingStripeSubscription = stripeSubscriptions.find(
      (subscription) =>
        [
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "incomplete",
          "paused",
        ].includes(subscription.status),
    );

    if (existingStripeSubscription) {
      return NextResponse.json(
        {
          error:
            "You already have a subscription. Manage it from your account.",
          code: "SUBSCRIPTION_EXISTS",
        },
        { status: 409 },
      );
    }

    // Look for an existing open Checkout Session for this customer.

    let openSessions;

    try {
      const result = await stripe.checkout.sessions.list({
        customer: customerId,
        status: "open",
        limit: 100,
      });

      if (result.has_more) {
        return NextResponse.json(
          {
            error: "Could not verify your checkout sessions. Please try again.",
          },
          { status: 503 },
        );
      }

      openSessions = result.data;
    } catch (error) {
      console.error("Could not retrieve Stripe Checkout Sessions:", error);

      return NextResponse.json(
        { error: "Could not verify your checkout sessions. Please try again." },
        { status: 503 },
      );
    }

    const customerSessions = openSessions.filter(
      (existingSession) =>
        existingSession.mode === "subscription" &&
        existingSession.metadata?.supabase_user_id === userId,
    );

    // Reuse an existing session if it matches the selected plan.
    const matchingSession = customerSessions.find(
      (existingSession) => existingSession.metadata?.plan === plan,
    );

    if (matchingSession?.url) {
      return NextResponse.json({ url: matchingSession.url });
    }

    // Expire sessions for other plans so they cannot be completed accidentally.
    for (const existingSession of customerSessions) {
      await stripe.checkout.sessions.expire(existingSession.id);
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        client_reference_id: userId,

        metadata: {
          supabase_user_id: userId,
          plan,
        },

        subscription_data: {
          metadata: {
            supabase_user_id: userId,
            plan,
          },
        },

        success_url: `${siteOrigin}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteOrigin}/?billing=cancelled`,
      },
      {
        idempotencyKey: `checkout-${userId}-${requestId}`,
      },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout creation failed:", error);

    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  } finally {
    if (checkoutLockAcquired && checkoutLockToken) {
      const { error: releaseError } = await createSupabaseAdminClient().rpc(
        "release_checkout_lock",
        {
          p_user_id: userId,
          p_lock_token: checkoutLockToken,
        },
      );

      if (releaseError) {
        console.error("Could not release checkout lock:", releaseError);
      }
    }
  }
};
