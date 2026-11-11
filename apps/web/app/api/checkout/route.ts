import { NextResponse } from "next/server";
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

    const customerId = await getOrCreateStripeCustomer(userId, user.email);

    const siteOrigin = new URL(process.env.SITE_URL ?? "http://localhost:3000")
      .origin;

    const session = await getStripeClient().checkout.sessions.create({
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
    });

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
  }
};
