import { type AccountType, hasDuplicateNames } from "@/app/lib/account-types";
import type {
  BudgetInput,
  BudgetSection,
  MonthBudget,
} from "@/app/lib/month-types";
import { sectionTitles } from "./constants";
import type { EditableBudget } from "./types";

export const signedEquityAmount = (type: AccountType, amount: string) =>
  type === "liability" ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

export const getEquityChangesFromSavedBaseline = (
  savedBudget: EditableBudget,
  totalEquity: EditableBudget["totalEquity"],
): EditableBudget["equityChange"] => {
  const totalEquityByAccountId = new Map(
    totalEquity.flatMap((entry) =>
      entry.accountId ? [[entry.accountId, entry] as const] : [],
    ),
  );
  const totalEquityById = new Map(
    totalEquity.map((entry) => [entry.id, entry]),
  );
  const savedItemNames = new Map<string, number>();
  for (const item of savedBudget.totalEquity) {
    const key = item.item.trim().toLowerCase();
    savedItemNames.set(key, (savedItemNames.get(key) ?? 0) + 1);
  }
  const savedChangeNames = new Map<string, EditableBudget["equityChange"]>();
  for (const change of savedBudget.equityChange) {
    const key = change.item.trim().toLowerCase();
    savedChangeNames.set(key, [...(savedChangeNames.get(key) ?? []), change]);
  }
  const usedChangeIds = new Set<string>();
  const matchedCurrentIds = new Set<string>();
  const toCents = (amount: number) => Math.round(amount * 100);
  const changes = savedBudget.totalEquity.flatMap((savedItem) => {
    const nextItem = savedItem.accountId
      ? totalEquityByAccountId.get(savedItem.accountId)
      : totalEquityById.get(savedItem.id);
    if (nextItem) {
      matchedCurrentIds.add(nextItem.id);
    }
    const nameMatches =
      savedItemNames.get(savedItem.item.trim().toLowerCase()) === 1
        ? savedChangeNames.get(savedItem.item.trim().toLowerCase())
        : undefined;
    const savedChange =
      savedBudget.equityChange.find(
        (entry) =>
          entry.accountId &&
          savedItem.accountId &&
          entry.accountId === savedItem.accountId,
      ) ?? (nameMatches?.length === 1 ? nameMatches[0] : undefined);
    if (savedChange) {
      usedChangeIds.add(savedChange.id);
    }
    const savedType =
      savedItem.accountType ??
      (Number(savedItem.amount) < 0 ? "liability" : "asset");
    const previousCurrentAmount = toCents(
      signedEquityAmount(savedType, savedItem.amount),
    );
    const previousAmount =
      previousCurrentAmount - toCents(Number(savedChange?.amount ?? 0));
    const nextType =
      nextItem?.accountType ??
      savedItem.accountType ??
      (Number(savedItem.amount) < 0 ? "liability" : "asset");
    const adjustedPreviousAmount =
      nextType === "liability"
        ? -Math.abs(previousAmount)
        : Math.abs(previousAmount);
    const nextAmount = nextItem
      ? toCents(signedEquityAmount(nextType, nextItem.amount))
      : 0;
    const amount = nextAmount - adjustedPreviousAmount;

    if (amount === 0) {
      return [];
    }

    return [
      {
        id: savedChange?.id ?? `equity-change-${savedItem.id}`,
        ...(savedItem.accountId ? { accountId: savedItem.accountId } : {}),
        item: nextItem?.item ?? savedItem.item,
        amount: (amount / 100).toFixed(2),
      },
    ];
  });

  const addedItems = totalEquity.flatMap((item) => {
    if (matchedCurrentIds.has(item.id)) {
      return [];
    }
    const type =
      item.accountType ?? (Number(item.amount) < 0 ? "liability" : "asset");
    const amount = toCents(signedEquityAmount(type, item.amount));
    if (amount === 0) {
      return [];
    }
    return [
      {
        id: `equity-change-${item.id}`,
        ...(item.accountId ? { accountId: item.accountId } : {}),
        item: item.item,
        amount: (amount / 100).toFixed(2),
      },
    ];
  });

  return [
    ...changes,
    ...savedBudget.equityChange.filter((entry) => !usedChangeIds.has(entry.id)),
    ...addedItems,
  ];
};

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
      if (
        section === "equityChange"
          ? !/^-?\d{1,12}(?:\.\d{1,2})?$/.test(entry.amount)
          : !/^\d{1,12}(?:\.\d{1,2})?$/.test(entry.amount)
      ) {
        return "Amounts must have up to 12 digits and 2 decimal places.";
      }
    }
    if (budget[section].length > 100) {
      return "Each table can contain up to 100 rows.";
    }
  }

  return null;
};
