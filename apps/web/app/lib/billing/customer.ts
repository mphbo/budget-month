import "server-only";
import { createSupabaseAdminClient } from "../supabase/admin";
import { getStripeClient } from "../stripe";

export const getOrCreateStripeCustomer = async (
  userId: string,
  email?: string | null,
) => {
  const supabaseAdmin = createSupabaseAdminClient();

  // Check whether this user already has a Stripe customer.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    return existing.stripe_customer_id;
  }

  // Create a Stripe customer if one doesn't exist.
  const customerParams = {
    metadata: {
      supabase_user_id: userId,
    },
    ...(email ? { email } : {}),
  };

  const customer = await getStripeClient().customers.create(customerParams, {
    idempotencyKey: `budget-month-customer-${userId}`,
  });

  // Save the relationship between Supabase and Stripe.
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("billing_customers")
    .insert({
      user_id: userId,
      stripe_customer_id: customer.id,
    })
    .select("stripe_customer_id")
    .single();

  if (!insertError && inserted) {
    return inserted.stripe_customer_id;
  }

  // Handle concurrent requests that may have created the mapping.
  if (insertError?.code === "23505") {
    const { data: concurrent, error: concurrentError } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!concurrentError && concurrent) {
      return concurrent.stripe_customer_id;
    }
  }

  throw insertError ?? new Error("Could not save Stripe customer.");
};
