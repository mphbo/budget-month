import { NextResponse } from "next/server";
import {
  type AccountInput,
  type AccountUpdateInput,
  hasDuplicateNames,
  isAccountCategory,
} from "../../lib/account-types";
import { createAccount, getAccounts, saveAccounts } from "../../lib/budgets";
import { mutationErrorResponse } from "../errors";

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
    isAccountCategory(account.category) &&
    typeof account.amount === "string" &&
    /^\d{1,12}(?:\.\d{1,2})?$/.test(account.amount)
  );
};

const isAccountUpdateInput = (value: unknown): value is AccountUpdateInput => {
  if (!isAccountInput(value)) {
    return false;
  }

  const account = value as AccountInput & { id?: unknown };
  return (
    typeof account.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      account.id,
    )
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
  try {
    const account = await createAccount(body.account);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return mutationErrorResponse("Could not add this account", error);
  }
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
    !body.accounts.every(isAccountUpdateInput)
  ) {
    return NextResponse.json(
      { error: "Account changes are invalid. Check each account's details." },
      { status: 400 },
    );
  }
  if (
    hasDuplicateNames(
      body.accounts.map((account) => (account as AccountInput).name),
    )
  ) {
    return NextResponse.json(
      { error: "Account names must be unique, ignoring capitalization." },
      { status: 409 },
    );
  }

  try {
    await saveAccounts(body.accounts);
    return NextResponse.json({ saved: true });
  } catch (error) {
    return mutationErrorResponse("Could not save your accounts", error);
  }
};
