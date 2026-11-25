import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";
import { getPlaidClient, getPlaidError } from "./client";
import { decryptAccessToken } from "./token-encryption";

const alreadyRemovedErrorCodes = new Set([
  "ITEM_NOT_FOUND",
  "INVALID_ACCESS_TOKEN",
]);

export const disconnectPlaidItemsForUser = async (userId: string) => {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, access_token_encrypted")
    .eq("user_id", userId)
    .neq("status", "disconnected");

  if (error) throw error;

  for (const item of items ?? []) {
    const accessToken = decryptAccessToken(item.access_token_encrypted);

    try {
      await getPlaidClient().itemRemove({
        access_token: accessToken,
      });
    } catch (error) {
      const plaidError = getPlaidError(error);

      if (!plaidError || !alreadyRemovedErrorCodes.has(plaidError.error_code)) {
        throw error;
      }
    }

    const { error: accountsError } = await supabaseAdmin
      .from("account_items")
      .update({
        plaid_item_id: null,
        plaid_account_id: null,
      })
      .eq("user_id", userId)
      .eq("plaid_item_id", item.id);

    if (accountsError) throw accountsError;

    const { error: itemError } = await supabaseAdmin
      .from("plaid_items")
      .update({
        status: "disconnected",
        access_token_encrypted: null,
        error_code: null,
      })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (itemError) throw itemError;
  }
};
