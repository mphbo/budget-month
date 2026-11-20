import "server-only";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  type PlaidError,
} from "plaid";
import { getPlaidConfig } from "./config";

let plaidClient: PlaidApi | null = null;

export const getPlaidClient = () => {
  if (!plaidClient) {
    const { clientId, secret, environment } = getPlaidConfig();
    plaidClient = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[environment],
        baseOptions: {
          headers: {
            "PLAID-CLIENT-ID": clientId,
            "PLAID-SECRET": secret,
          },
        },
      }),
    );
  }

  return plaidClient;
};

export const getPlaidError = (error: unknown): PlaidError | null => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return null;
  }

  const data = (error as { response?: { data?: unknown } }).response?.data;
  return typeof data === "object" &&
    data !== null &&
    "error_code" in data &&
    typeof data.error_code === "string"
    ? (data as PlaidError)
    : null;
};
