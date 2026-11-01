import { NextResponse } from "next/server";
import {
  deleteMonth,
  getMonthBudget,
  isCurrentMonth,
  saveMonthBudget,
} from "../../../lib/budgets";
import {
  type BudgetInput,
  type BudgetItemInput,
  type BudgetSection,
  budgetSections,
} from "../../../lib/month-types";
import { mutationErrorResponse } from "../../errors";

const isBudgetEntry = (
  value: unknown,
  section: BudgetSection,
  requireCurrentAccountLinks: boolean,
): value is BudgetItemInput => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  const allowsDate = section === "income" || section === "expenses";
  const validDate =
    entry.date === undefined ||
    (allowsDate &&
      typeof entry.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
      entry.date >= "0001-01-01" &&
      !Number.isNaN(Date.parse(`${entry.date}T00:00:00.000Z`)) &&
      new Date(`${entry.date}T00:00:00.000Z`).toISOString().slice(0, 10) ===
        entry.date);
  const validAccountLink =
    section === "totalEquity"
      ? entry.accountId === undefined
        ? !requireCurrentAccountLinks
        : typeof entry.accountId === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            entry.accountId,
          )
      : entry.accountId === undefined;

  return (
    validDate &&
    typeof entry.item === "string" &&
    entry.item.trim().length > 0 &&
    entry.item.trim().length <= 200 &&
    typeof entry.amount === "string" &&
    /^-?\d{1,12}(?:\.\d{1,2})?$/.test(entry.amount) &&
    validAccountLink
  );
};

const isBudgetInput = (
  value: unknown,
  requireCurrentAccountLinks: boolean,
): value is BudgetInput => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return budgetSections.every((section) => {
    const entries = (value as Record<string, unknown>)[section];
    return (
      Array.isArray(entries) &&
      entries.length <= 100 &&
      entries.every((entry) =>
        isBudgetEntry(entry, section, requireCurrentAccountLinks),
      )
    );
  });
};

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ month: string }> },
) => {
  const { month } = await params;
  const budget = await getMonthBudget(month);

  if (!budget) {
    return NextResponse.json({ error: "Month not found." }, { status: 404 });
  }

  return NextResponse.json(budget);
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ month: string }> },
) => {
  const { month } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    throw error;
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("budget" in body) ||
    !isBudgetInput(body.budget, isCurrentMonth(month))
  ) {
    return NextResponse.json(
      { error: "Budget entries are invalid. Check item names and amounts." },
      { status: 400 },
    );
  }

  try {
    const saved = await saveMonthBudget(month, body.budget);
    if (!saved) {
      return NextResponse.json({ error: "Month not found." }, { status: 404 });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    return mutationErrorResponse("Could not save this month's budget", error);
  }
};

export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ month: string }> },
) => {
  const { month } = await params;
  let result: Awaited<ReturnType<typeof deleteMonth>>;
  try {
    result = await deleteMonth(month);
  } catch (error) {
    return mutationErrorResponse("Could not delete this month", error);
  }

  if (result === "invalid") {
    return NextResponse.json({ error: "Month is invalid." }, { status: 400 });
  }
  if (result === "not_found") {
    return NextResponse.json({ error: "Month not found." }, { status: 404 });
  }
  if (result === "not_deletable") {
    return NextResponse.json(
      {
        error:
          "Only the oldest past month or newest future month can be deleted.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ deleted: true });
};
