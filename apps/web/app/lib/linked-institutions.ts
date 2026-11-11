import "server-only";
import type { AccountBase } from "plaid";
import type { Account, AccountType } from "./account-types";
import { parseAccountCategory } from "./account-types";
import { getAuthorizedSupabaseClient } from "./budgets";
import type {
  LinkedAccountBalance,
  LinkedInstitution,
  LinkedInstitutionStatus,
} from "./linked-institution-types";
import { toBalanceAmount, toLinkedAccountInput } from "./plaid/accounts";
import { getPlaidClient, getPlaidError } from "./plaid/client";
import { getPlaidConfig } from "./plaid/config";
import { canUseLinkedInstitutions } from "./plaid/entitlement";
import {
  decryptAccessToken,
  encryptAccessToken,
} from "./plaid/token-encryption";

export class LinkedInstitutionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "LinkedInstitutionError";
  }
}

const loginRequiredErrorCodes = new Set([
  "ITEM_LOGIN_REQUIRED",
  "PENDING_EXPIRATION",
  "PENDING_DISCONNECT",
  "ACCESS_NOT_GRANTED",
]);
const removedItemErrorCodes = new Set([
  "ITEM_NOT_FOUND",
  "INVALID_ACCESS_TOKEN",
]);

const getAuthorizedLinkingClient = async () => {
  const client = await getAuthorizedSupabaseClient();
  if (!(await canUseLinkedInstitutions(client.userId))) {
    throw new LinkedInstitutionError(
      "Connecting financial institutions isn't available for your account.",
      403,
      "LINKING_UNAVAILABLE",
    );
  }

  return client;
};

type AuthorizedClient = Awaited<ReturnType<typeof getAuthorizedLinkingClient>>;

type PlaidItemRow = {
  id: string;
  institution_name: string;
  status: LinkedInstitutionStatus;
  last_synced_at: string | null;
};

const plaidItemColumns = "id, institution_name, status, last_synced_at";

const toLinkedInstitution = (row: PlaidItemRow): LinkedInstitution => ({
  id: row.id,
  institutionName: row.institution_name,
  status: row.status,
  lastSyncedAt: row.last_synced_at,
});

const getInstitution = async (
  { supabase, userId }: AuthorizedClient,
  id: string,
) => {
  const { data, error } = await supabase
    .from("plaid_items")
    .select(plaidItemColumns)
    .eq("user_id", userId)
    .eq("id", id)
    .single<PlaidItemRow>();

  if (error) {
    throw error;
  }

  return toLinkedInstitution(data);
};

const getInstitutionAccounts = async (
  { supabase, userId }: AuthorizedClient,
  institutionId: string,
): Promise<Account[]> => {
  const { data, error } = await supabase
    .from("account_items")
    .select("id, name, account_type, category, amount, plaid_item_id")
    .eq("user_id", userId)
    .eq("plaid_item_id", institutionId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.account_type as AccountType,
    category: parseAccountCategory(account.category),
    amount: Number(account.amount),
    plaidItemId: account.plaid_item_id,
  }));
};

const getAccessToken = async (
  { supabase }: AuthorizedClient,
  institutionId: string,
) => {
  const { data, error } = await supabase.rpc("get_plaid_item_access_token", {
    p_item_id: institutionId,
  });

  if (error) {
    throw error;
  }
  if (typeof data !== "string") {
    throw new Error("Linked institution returned an invalid access token.");
  }

  return decryptAccessToken(data);
};

const markLoginRequiredOnPlaidError = async (
  { supabase }: AuthorizedClient,
  institutionId: string,
  error: unknown,
) => {
  const plaidError = getPlaidError(error);
  if (!plaidError) {
    return;
  }

  const status = loginRequiredErrorCodes.has(plaidError.error_code)
    ? "login_required"
    : "error";
  await supabase.rpc("set_plaid_item_status", {
    p_item_id: institutionId,
    p_status: status,
    p_error_code: plaidError.error_code,
  });

  if (status === "login_required") {
    throw new LinkedInstitutionError(
      "Your login for this institution has expired. Reconnect to keep balances up to date.",
      409,
      "LOGIN_REQUIRED",
    );
  }
};

export const getLinkedInstitutionsAccess = async (): Promise<{
  enabled: boolean;
  institutions: LinkedInstitution[];
}> => {
  const { supabase, userId } = await getAuthorizedSupabaseClient();
  if (!(await canUseLinkedInstitutions(userId))) {
    return { enabled: false, institutions: [] };
  }

  const { data, error } = await supabase
    .from("plaid_items")
    .select(plaidItemColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .returns<PlaidItemRow[]>();

  if (error) {
    console.error("Could not load linked institutions", error);
    return { enabled: false, institutions: [] };
  }

  return { enabled: true, institutions: data.map(toLinkedInstitution) };
};

export const createLinkToken = async (institutionId?: string) => {
  const client = await getAuthorizedLinkingClient();
  const { countryCodes, products, optionalProducts } = getPlaidConfig();
  const accessToken = institutionId
    ? await getAccessToken(client, institutionId)
    : undefined;

  const { data } = await getPlaidClient().linkTokenCreate({
    client_name: "Budget Month",
    language: "en",
    country_codes: countryCodes,
    user: { client_user_id: client.userId },
    ...(accessToken
      ? { access_token: accessToken }
      : {
          products,
          ...(optionalProducts.length > 0
            ? { optional_products: optionalProducts }
            : {}),
        }),
  });

  return data.link_token;
};

const getInstitutionName = async (
  institutionId: string | null | undefined,
  institutionName: string | null | undefined,
) => {
  if (institutionName?.trim()) {
    return institutionName.trim();
  }
  if (!institutionId) {
    return "Linked institution";
  }

  try {
    const { data } = await getPlaidClient().institutionsGetById({
      institution_id: institutionId,
      country_codes: getPlaidConfig().countryCodes,
    });
    return data.institution.name;
  } catch (error) {
    console.error("Could not look up the institution name", error);
    return "Linked institution";
  }
};

const removePlaidItem = async (accessToken: string) => {
  try {
    await getPlaidClient().itemRemove({ access_token: accessToken });
  } catch (error) {
    const plaidError = getPlaidError(error);
    if (!plaidError || !removedItemErrorCodes.has(plaidError.error_code)) {
      throw error;
    }
  }
};

export const linkInstitution = async (publicToken: string) => {
  const client = await getAuthorizedLinkingClient();
  const plaid = getPlaidClient();
  const {
    data: { access_token: accessToken, item_id: plaidItemId },
  } = await plaid.itemPublicTokenExchange({ public_token: publicToken });

  try {
    const {
      data: { accounts, item },
    } = await plaid.accountsGet({ access_token: accessToken });
    const institutionName = await getInstitutionName(
      item.institution_id,
      item.institution_name,
    );

    const { data: institutionId, error } = await client.supabase.rpc(
      "link_plaid_item",
      {
        p_plaid_item_id: plaidItemId,
        p_institution_id: item.institution_id ?? null,
        p_institution_name: institutionName,
        p_access_token_encrypted: encryptAccessToken(accessToken),
        p_accounts: accounts.map((account: AccountBase) =>
          toLinkedAccountInput(account, institutionName),
        ),
      },
    );

    if (error) {
      throw error;
    }
    if (typeof institutionId !== "string") {
      throw new Error("Linking returned an invalid institution id.");
    }

    return {
      institution: await getInstitution(client, institutionId),
      accounts: await getInstitutionAccounts(client, institutionId),
    };
  } catch (error) {
    await removePlaidItem(accessToken).catch((removeError) =>
      console.error("Could not remove an unsaved Plaid item", removeError),
    );
    throw error;
  }
};

export const refreshInstitution = async (institutionId: string) => {
  const client = await getAuthorizedLinkingClient();
  const accessToken = await getAccessToken(client, institutionId);

  let accounts: AccountBase[];
  try {
    ({
      data: { accounts },
    } = await getPlaidClient().accountsGet({ access_token: accessToken }));
  } catch (error) {
    await markLoginRequiredOnPlaidError(client, institutionId, error);
    throw error;
  }

  const { error } = await client.supabase.rpc("update_plaid_item_balances", {
    p_item_id: institutionId,
    p_balances: accounts.map((account) => ({
      plaidAccountId: account.account_id,
      amount: toBalanceAmount(account),
    })),
  });

  if (error) {
    throw error;
  }

  const balances: LinkedAccountBalance[] = (
    await getInstitutionAccounts(client, institutionId)
  ).map(({ id, amount }) => ({ id, amount }));

  return {
    institution: await getInstitution(client, institutionId),
    balances,
  };
};

export const unlinkInstitution = async (institutionId: string) => {
  const client = await getAuthorizedLinkingClient();
  await removePlaidItem(await getAccessToken(client, institutionId));

  const { error } = await client.supabase.rpc("unlink_plaid_item", {
    p_item_id: institutionId,
  });

  if (error) {
    throw error;
  }
};
