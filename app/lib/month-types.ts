export type MonthCreateMode = "copy" | "fresh";

export type BudgetItem = {
  item: string;
  amount: number;
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

export type NextMonthOption = MonthOption & {
  copyFrom: MonthOption | null;
};
