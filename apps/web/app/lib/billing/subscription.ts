import "server-only";

import { getAuthorizedSupabaseClient } from "../budgets";

export type UserSubscription = {
  stripeSubscriptionId: string;
  priceId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  trialEnd: string | null;
};

export const getCurrentSubscription =
  async (): Promise<UserSubscription | null> => {
    const { supabase, userId } = await getAuthorizedSupabaseClient();

    const columns = `
      stripe_subscription_id,
      stripe_price_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      cancel_at,
      trial_end
    `;

    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select(columns)
      .eq("user_id", userId)
      .in("status", [
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "incomplete",
        "paused",
      ])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to retrieve subscription:", error);
      throw new Error("Could not retrieve subscription information.");
    }

    // If no existing subscription is found, fall back to the
    // latest record so canceled subscription information remains visible.
    if (!data) {
      const { data: canceledData, error: canceledError } = await supabase
        .from("billing_subscriptions")
        .select(columns)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (canceledError) {
        console.error("Failed to retrieve subscription:", canceledError);
        throw new Error("Could not retrieve subscription information.");
      }

      if (!canceledData) return null;

      return {
        stripeSubscriptionId: canceledData.stripe_subscription_id,
        priceId: canceledData.stripe_price_id,
        status: canceledData.status,
        currentPeriodStart: canceledData.current_period_start,
        currentPeriodEnd: canceledData.current_period_end,
        cancelAtPeriodEnd: canceledData.cancel_at_period_end,
        cancelAt: canceledData.cancel_at,
        trialEnd: canceledData.trial_end,
      };
    }

    return {
      stripeSubscriptionId: data.stripe_subscription_id,
      priceId: data.stripe_price_id,
      status: data.status,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      cancelAt: data.cancel_at,
      trialEnd: data.trial_end,
    };
  };
