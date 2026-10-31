export type BudgetItem = {
  item: string;
  amount: number;
};

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

export type MonthCreateMode = "copy" | "fresh";

const monthSequence: MonthOption[] = [
  { slug: "january", name: "January" },
  { slug: "february", name: "February" },
  { slug: "march", name: "March" },
  { slug: "april", name: "April" },
  { slug: "may", name: "May" },
  { slug: "june", name: "June" },
  { slug: "july", name: "July" },
  { slug: "august", name: "August" },
  { slug: "september", name: "September" },
  { slug: "october", name: "October" },
  { slug: "november", name: "November" },
  { slug: "december", name: "December" },
];

const initialMonthBudgets: Record<string, MonthBudget> = {
  "november-2025": {
    name: "November 2025",
    income: [
      { item: "Salary", amount: 5350 },
      { item: "Rent", amount: 2400 },
    ],
    expenses: [
      { item: "Rent", amount: 1850 },
      { item: "Groceries", amount: 425.68 },
      { item: "Utilities", amount: 164.23 },
      { item: "Transportation", amount: 120 },
    ],
    equityChange: [
      { item: "Credit", amount: 500 },
      { item: "Student Loan", amount: 300 },
      { item: "Rainy Day", amount: 500 },
    ],
    totalEquity: [
      { item: "Credit", amount: -1200 },
      { item: "Student Loan", amount: -800 },
      { item: "Rainy Day", amount: 1600 },
      { item: "House Value", amount: 350000 },
      { item: "Mortgage", amount: -206656.16 },
    ],
  },
  "december-2025": {
    name: "December 2025",
    income: [
      { item: "Salary", amount: 5350 },
      { item: "Holiday bonus", amount: 1000 },
    ],
    expenses: [
      { item: "Rent", amount: 1850 },
      { item: "Groceries", amount: 560 },
      { item: "Utilities", amount: 172.5 },
      { item: "Gifts", amount: 450 },
    ],
    equityChange: [
      { item: "Credit", amount: 650 },
      { item: "Student Loan", amount: 300 },
      { item: "Rainy Day", amount: 400 },
    ],
    totalEquity: [
      { item: "Credit", amount: -550 },
      { item: "Student Loan", amount: -500 },
      { item: "Rainy Day", amount: 2000 },
      { item: "House Value", amount: 350000 },
      { item: "Mortgage", amount: -206300 },
    ],
  },
  "january-2026": {
    name: "January 2026",
    income: [
      { item: "Salary", amount: 5350 },
      { item: "Side work", amount: 350 },
    ],
    expenses: [
      { item: "Rent", amount: 1850 },
      { item: "Groceries", amount: 390 },
      { item: "Utilities", amount: 158.75 },
      { item: "Transportation", amount: 135 },
    ],
    equityChange: [
      { item: "Credit", amount: 700 },
      { item: "Student Loan", amount: 300 },
      { item: "Rainy Day", amount: 600 },
    ],
    totalEquity: [
      { item: "Credit", amount: -1850 },
      { item: "Student Loan", amount: -200 },
      { item: "Rainy Day", amount: 2600 },
      { item: "House Value", amount: 352000 },
      { item: "Mortgage", amount: -205900 },
    ],
  },
  "february-2026": {
    name: "February 2026",
    income: [
      { item: "Salary", amount: 5350 },
      { item: "Side work", amount: 200 },
    ],
    expenses: [
      { item: "Rent", amount: 1850 },
      { item: "Groceries", amount: 410 },
      { item: "Utilities", amount: 151.2 },
      { item: "Transportation", amount: 120 },
    ],
    equityChange: [
      { item: "Credit", amount: 550 },
      { item: "Student Loan", amount: 300 },
      { item: "Rainy Day", amount: 500 },
    ],
    totalEquity: [
      { item: "Credit", amount: -2400 },
      { item: "Student Loan", amount: 100 },
      { item: "Rainy Day", amount: 3100 },
      { item: "House Value", amount: 352000 },
      { item: "Mortgage", amount: -205550 },
    ],
  },
  "march-2026": {
    name: "March 2026",
    income: [
      { item: "Salary", amount: 5350 },
      { item: "Side work", amount: 250 },
    ],
    expenses: [
      { item: "Rent", amount: 1850 },
      { item: "Groceries", amount: 405 },
      { item: "Utilities", amount: 162.8 },
      { item: "Transportation", amount: 125 },
    ],
    equityChange: [
      { item: "Credit", amount: 600 },
      { item: "Student Loan", amount: 300 },
      { item: "Rainy Day", amount: 550 },
    ],
    totalEquity: [
      { item: "Credit", amount: -3000 },
      { item: "Student Loan", amount: 400 },
      { item: "Rainy Day", amount: 3650 },
      { item: "House Value", amount: 352000 },
      { item: "Mortgage", amount: -205200 },
    ],
  },
};

const globalForMonthData = globalThis as typeof globalThis & {
  __budgetMonthMockBudgets?: Record<string, MonthBudget>;
};

if (!globalForMonthData.__budgetMonthMockBudgets) {
  globalForMonthData.__budgetMonthMockBudgets = initialMonthBudgets;
}

const mockMonthBudgets =
  globalForMonthData.__budgetMonthMockBudgets ?? initialMonthBudgets;

function cloneBudget(budget: MonthBudget): MonthBudget {
  return {
    name: budget.name,
    income: budget.income.map((item) => ({ ...item })),
    expenses: budget.expenses.map((item) => ({ ...item })),
    equityChange: budget.equityChange.map((item) => ({ ...item })),
    totalEquity: budget.totalEquity.map((item) => ({ ...item })),
  };
}

export function getMonthOptions(): MonthOption[] {
  return Object.keys(mockMonthBudgets).map((slug) => ({
    slug,
    name: mockMonthBudgets[slug].name,
  }));
}

export function getNextMonthOption() {
  const months = getMonthOptions();
  const latestMonth = months.at(-1);

  if (!latestMonth) {
    return null;
  }

  const [latestMonthSlug, latestYearValue] = latestMonth.slug.split("-");
  const latestIndex = monthSequence.findIndex(
    (month) => month.slug === latestMonthSlug,
  );
  const latestYear = Number(latestYearValue);

  if (latestIndex < 0 || !Number.isInteger(latestYear)) {
    return null;
  }

  const nextMonthIndex = (latestIndex + 1) % monthSequence.length;
  const nextMonth = monthSequence[nextMonthIndex];
  const nextYear = latestYear + (nextMonthIndex === 0 ? 1 : 0);
  const nextSlug = `${nextMonth.slug}-${nextYear}`;

  if (mockMonthBudgets[nextSlug]) {
    return null;
  }

  return {
    slug: nextSlug,
    name: `${nextMonth.name} ${nextYear}`,
    copyFrom: latestMonth,
  };
}

export function createNextMonth(mode: MonthCreateMode) {
  const nextMonth = getNextMonthOption();

  if (!nextMonth) {
    return null;
  }

  const sourceBudget = mockMonthBudgets[nextMonth.copyFrom.slug];
  const budget =
    mode === "copy"
      ? { ...cloneBudget(sourceBudget), name: nextMonth.name }
      : {
          name: nextMonth.name,
          income: [],
          expenses: [],
          equityChange: [],
          totalEquity: [],
        };

  mockMonthBudgets[nextMonth.slug] = budget;
  return { slug: nextMonth.slug, budget: cloneBudget(budget) };
}

export async function getMonthBudget(month: string) {
  const requestedMonth = month.toLowerCase();
  const matchingSlug = getMonthOptions()
    .reverse()
    .find((option) => option.slug.startsWith(`${requestedMonth}-`))?.slug;
  const budget =
    mockMonthBudgets[requestedMonth] ??
    (matchingSlug ? mockMonthBudgets[matchingSlug] : undefined);
  return budget ? cloneBudget(budget) : null;
}
