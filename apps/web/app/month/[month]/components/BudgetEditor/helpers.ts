import { AccountInput, hasDuplicateNames } from "@/app/lib/account-types";
import { BudgetInput, MonthBudget, BudgetSection } from "@/app/lib/month-types";
import { EditableBudget } from "./types";
import { sectionTitles } from "./constants";

export const signedAmount = (
  accountType: AccountInput["type"],
  amount: string,
) =>
  (accountType === "liability"
    ? -Math.abs(Number(amount))
    : Number(amount)
  ).toFixed(2);

export const createEditableBudget = (budget: MonthBudget): EditableBudget => {
  return {
    income: budget.income.map((entry, index) => ({
      ...entry,
      id: `income-${index}`,
      amount: entry.amount.toFixed(2),
    })),
    expenses: budget.expenses.map((entry, index) => ({
      ...entry,
      id: `expenses-${index}`,
      amount: entry.amount.toFixed(2),
    })),
    equityChange: budget.equityChange.map((entry, index) => ({
      ...entry,
      id: `equityChange-${index}`,
      amount: entry.amount.toFixed(2),
    })),
    totalEquity: budget.totalEquity.map((entry, index) => ({
      ...entry,
      id: `totalEquity-${index}`,
      amount: entry.amount.toFixed(2),
    })),
  };
};

export const toBudgetInput = (budget: EditableBudget): BudgetInput => {
  return {
    income: budget.income.map(({ item, amount, date }) => ({
      item,
      amount,
      ...(date ? { date } : {}),
    })),
    expenses: budget.expenses.map(({ item, amount, date }) => ({
      item,
      amount,
      ...(date ? { date } : {}),
    })),
    equityChange: budget.equityChange.map(({ item, amount }) => ({
      item,
      amount,
    })),
    totalEquity: budget.totalEquity.map(
      ({ item, amount, accountId, accountType, category }) => ({
        item,
        amount,
        ...(accountId ? { accountId } : {}),
        ...(accountType ? { accountType } : {}),
        ...(category ? { category } : {}),
      }),
    ),
  };
};

const getBudgetSectionSnapshot = (items: BudgetInput[BudgetSection]) =>
  JSON.stringify(
    items.map(({ item, amount, accountId, accountType, category, date }) => ({
      item: item.trim(),
      amount: /^-?\d{1,12}(?:\.\d{1,2})?$/.test(amount)
        ? Number(amount).toFixed(2)
        : amount,
      ...(accountId ? { accountId } : {}),
      ...(accountType ? { accountType } : {}),
      ...(category ? { category } : {}),
      ...(date ? { date } : {}),
    })),
  );

export const getBudgetSectionSnapshots = (
  budget: BudgetInput,
): Record<BudgetSection, string> => ({
  income: getBudgetSectionSnapshot(budget.income),
  expenses: getBudgetSectionSnapshot(budget.expenses),
  equityChange: getBudgetSectionSnapshot(budget.equityChange),
  totalEquity: getBudgetSectionSnapshot(budget.totalEquity),
});

export const getBudgetSnapshot = (budget: BudgetInput) =>
  JSON.stringify(getBudgetSectionSnapshots(budget));

export const getValidationError = (budget: EditableBudget) => {
  if (hasDuplicateNames(budget.totalEquity.map((entry) => entry.item))) {
    return "Total Equity item names must be unique in this month, ignoring capitalization.";
  }

  for (const section of Object.keys(sectionTitles) as BudgetSection[]) {
    for (const entry of budget[section]) {
      if (!entry.item.trim() || entry.item.trim().length > 200) {
        return "Each row needs an item name of 1 to 200 characters.";
      }
      if (!/^-?\d{1,12}(?:\.\d{1,2})?$/.test(entry.amount)) {
        return "Amounts must have up to 12 digits and 2 decimal places.";
      }
    }
    if (budget[section].length > 100) {
      return "Each table can contain up to 100 rows.";
    }
  }

  return null;
};
