import { NextResponse } from "next/server";
import { getAuthorizedSupabaseClient } from "@/app/lib/budgets";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getStripeClient } from "@/app/lib/stripe";

export const POST = async () => {
  try {
    // Authenticate the user using their Supabase session.
    const { supabase, userId } = await getAuthorizedSupabaseClient();

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

    // Retrieve this user's Stripe customer mapping.
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: billingCustomer, error: customerError } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerError) {
      throw customerError;
    }

    if (!billingCustomer) {
      return NextResponse.json(
        { error: "No billing account was found." },
        { status: 404 },
      );
    }

    const siteUrl = process.env.SITE_URL;

    if (!siteUrl) {
      throw new Error("SITE_URL is not configured.");
    }

    // Create a Stripe Customer Portal session.
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: new URL("/settings/account", siteUrl).toString(),
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Customer Portal session creation failed:", error);

    return NextResponse.json(
      { error: "Could not open subscription management." },
      { status: 500 },
    );
  }
};
