import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "../supabase/admin";
import { getStripeClient } from "../stripe";

export const getOrCreateStripeCustomer = async (
  userId: string,
  email?: string | null,
) => {
  const supabaseAdmin = createSupabaseAdminClient();
  const stripe = getStripeClient();

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    const customer = await stripe.customers.retrieve(
      existing.stripe_customer_id,
    );

    if (!customer.deleted) {
      return customer.id;
    }

    // Remove only the mapping to the deleted Stripe customer.
    const { error: deleteError } = await supabaseAdmin
      .from("billing_customers")
      .delete()
      .eq("user_id", userId)
      .eq("stripe_customer_id", existing.stripe_customer_id);

    if (deleteError) {
      throw deleteError;
    }
  }

  // Create a replacement Stripe customer.
  const customer = await stripe.customers.create(
    {
      metadata: {
        supabase_user_id: userId,
      },
      ...(email ? { email } : {}),
    },
    {
      idempotencyKey: `budget-month-customer-${userId}-${randomUUID()}`,
    },
  );

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

  // Handle a concurrent request that created the mapping first.
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

export const syncStripeCustomerEmail = async (
  userId: string,
  email: string | null | undefined,
) => {
  if (!email) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: customer, error } = await supabaseAdmin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Users without a Stripe customer need no synchronization.
  if (!customer) {
    return;
  }

  await getStripeClient().customers.update(customer.stripe_customer_id, {
    email,
  });
};
