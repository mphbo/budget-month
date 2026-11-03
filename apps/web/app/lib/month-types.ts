import type { AccountCategory, AccountType } from "./account-types";

export type MonthCreateMode = "copy" | "fresh";

export type BudgetItem = {
  item: string;
  amount: number;
  accountId?: string;
  accountType?: AccountType;
  category?: AccountCategory;
  date?: string;
};

export const budgetSections = [
  "income",
  "expenses",
  "equityChange",
  "totalEquity",
] as const;

export type BudgetSection = (typeof budgetSections)[number];

export type BudgetItemInput = {
  item: string;
  amount: string;
  accountId?: string;
  accountType?: AccountType;
  category?: AccountCategory;
  date?: string;
};

export type BudgetInput = Record<BudgetSection, BudgetItemInput[]>;

export type MonthBudget = {
  name: string;
  income: BudgetItem[];
  expenses: BudgetItem[];
  equityChange: BudgetItem[];
  totalEquity: BudgetItem[];
};

export type MonthOption = {
  slug: string;
  name: string;
};

export type EquityHistoryPoint = {
  month: string;
  categoryValues: Record<string, number>;
};

export type NextMonthOption = MonthOption & {
  copyFrom: MonthOption | null;
};

export type PreviousMonthOption = MonthOption & {
  copyFrom: MonthOption;
};

export type MonthDirection = "previous" | "next";
