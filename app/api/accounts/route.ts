import { NextResponse } from "next/server";
import type { AccountInput } from "../../lib/account-types";
import { createAccount, getAccounts, saveAccounts } from "../../lib/budgets";

const isAccountInput = (value: unknown): value is AccountInput => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const account = value as Record<string, unknown>;
  return (
    typeof account.name === "string" &&
    account.name.trim().length > 0 &&
    account.name.trim().length <= 120 &&
    (account.type === "asset" || account.type === "liability") &&
    typeof account.category === "string" &&
    account.category.trim().length > 0 &&
    account.category.trim().length <= 100 &&
    typeof account.amount === "string" &&
    /^\d{1,12}(?:\.\d{1,2})?$/.test(account.amount)
  );
};

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }

    throw error;
  }
};

export const GET = async () => {
  return NextResponse.json({ accounts: await getAccounts() });
};

export const POST = async (request: Request) => {
  const body = await readJson(request);
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("account" in body) ||
    !isAccountInput(body.account)
  ) {
    return NextResponse.json(
      {
        error:
          "Provide an account name, asset or liability type, category, and valid amount.",
      },
      { status: 400 },
    );
  }

  const account = await createAccount(body.account);
  return NextResponse.json({ account }, { status: 201 });
};

export const PATCH = async (request: Request) => {
  const body = await readJson(request);
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("accounts" in body) ||
    !Array.isArray(body.accounts) ||
    body.accounts.length > 100 ||
    !body.accounts.every(isAccountInput)
  ) {
    return NextResponse.json(
      { error: "Account changes are invalid. Check each account's details." },
      { status: 400 },
    );
  }

  await saveAccounts(body.accounts);
  return NextResponse.json({ saved: true });
};
