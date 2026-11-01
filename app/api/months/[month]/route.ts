import { NextResponse } from "next/server";
import { getMonthBudget, saveMonthBudget } from "../../../lib/budgets";
import { type BudgetInput, budgetSections } from "../../../lib/month-types";

const isBudgetInput = (value: unknown): value is BudgetInput => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return budgetSections.every((section) => {
    const entries = (value as Record<string, unknown>)[section];
    return (
      Array.isArray(entries) &&
      entries.length <= 100 &&
      entries.every(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          !Array.isArray(entry) &&
          typeof entry.item === "string" &&
          entry.item.trim().length > 0 &&
          entry.item.trim().length <= 200 &&
          typeof entry.amount === "string" &&
          /^-?\d{1,12}(?:\.\d{1,2})?$/.test(entry.amount),
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
    !isBudgetInput(body.budget)
  ) {
    return NextResponse.json(
      { error: "Budget entries are invalid. Check item names and amounts." },
      { status: 400 },
    );
  }

  const saved = await saveMonthBudget(month, body.budget);
  if (!saved) {
    return NextResponse.json({ error: "Month not found." }, { status: 404 });
  }

  return NextResponse.json({ saved: true });
};
