import "server-only";
import { createSupabaseAdminClient } from "../supabase/admin";
import { isPlaidConfigured } from "./config";

const eligibleSubscriptionStatuses = ["active", "trialing"];

export const canUseLinkedInstitutions = async (userId: string) => {
  if (!isPlaidConfigured()) {
    return false;
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", eligibleSubscriptionStatuses)
    .limit(1);

  if (error) {
    console.error("Could not verify subscription entitlement:", error);
    return false;
  }

  return data.length > 0;
};
