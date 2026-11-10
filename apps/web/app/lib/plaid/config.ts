import "server-only";
import { CountryCode, Products } from "plaid";

const plaidEnvironments = ["sandbox", "production"] as const;
export type PlaidEnvironmentName = (typeof plaidEnvironments)[number];

const parseList = <T extends string>(
  value: string | undefined,
  fallback: string,
  allowed: readonly T[],
  variable: string,
): T[] => {
  const entries = (value ?? fallback)
    .split(",")
    .map((entry) => entry.trim())i
    .filter(Boolean);

  for (const entry of entries) {
    if (!allowed.includes(entry as T)) {
      throw new Error(`${variable} contains an unsupported value: ${entry}.`);
    }
  }

  return entries as T[];
};

export const isPlaidConfigured = () =>
  Boolean(
    process.env.PLAID_CLIENT_ID &&
      process.env.PLAID_SECRET &&
      process.env.PLAID_TOKEN_ENCRYPTION_KEY,
  );

export const getPlaidConfig = () => {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const environment = (process.env.PLAID_ENV ??
    "sandbox") as PlaidEnvironmentName;

  if (!clientId || !secret) {
    throw new Error(
      "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.",
    );
  }
  if (!plaidEnvironments.includes(environment)) {
    throw new Error("PLAID_ENV must be sandbox or production.");
  }

  const allProducts = Object.values(Products);
  const products = parseList(
    process.env.PLAID_PRODUCTS,
    Products.Transactions,
    allProducts,
    "PLAID_PRODUCTS",
  );
  if (products.length === 0) {
    throw new Error("PLAID_PRODUCTS must include at least one product.");
  }

  return {
    clientId,
    secret,
    environment,
    countryCodes: parseList(
      process.env.PLAID_COUNTRY_CODES,
      "US,CA",
      Object.values(CountryCode),
      "PLAID_COUNTRY_CODES",
    ),
    products,
    optionalProducts: parseList(
      process.env.PLAID_OPTIONAL_PRODUCTS,
      "",
      allProducts,
      "PLAID_OPTIONAL_PRODUCTS",
    ).filter((product) => !products.includes(product)),
  };
};
