import "server-only";

import { getAuthorizedSupabaseClient } from "../budgets";

export type UserSubscription = {
  stripeSubscriptionId: string;
  priceId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
};

export const getCurrentSubscription =
  async (): Promise<UserSubscription | null> => {
    const { supabase, userId } = await getAuthorizedSupabaseClient();

    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select(
        `
          stripe_subscription_id,
          stripe_price_id,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          trial_end
        `,
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to retrieve subscription:", error);
      throw new Error("Could not retrieve subscription information.");
    }

    if (!data) {
      return null;
    }

    return {
      stripeSubscriptionId: data.stripe_subscription_id,
      priceId: data.stripe_price_id,
      status: data.status,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      trialEnd: data.trial_end,
    };
  };
