export type AccountType = "asset" | "liability";
export type Account = {
  id: string;
  name: string;
  type: AccountType;
  category: string;
  amount: number;
};
export type BudgetItem = {
  item: string;
  amount: number;
  accountId?: string;
  accountType?: AccountType;
  category?: string;
  date?: string;
};
export type EditableBudgetItem = Omit<BudgetItem, "amount"> & {
  id: string;
  amount: string;
};
export type BudgetSection =
  | "income"
  | "expenses"
  | "equityChange"
  | "totalEquity";
export type BudgetInput = Record<BudgetSection, BudgetItem[]>;
export type MonthOption = { slug: string; name: string };
export type EquityHistoryPoint = {
  month: string;
  categoryValues: Record<string, number>;
};
export type MonthBudget = {
  name: string;
  income: BudgetItem[];
  expenses: BudgetItem[];
  equityChange: BudgetItem[];
  totalEquity: BudgetItem[];
};

export const sections: { key: BudgetSection; title: string }[] = [
  { key: "income", title: "Income" },
  { key: "expenses", title: "Expenses" },
  { key: "equityChange", title: "Equity Change" },
  { key: "totalEquity", title: "Total Equity" },
];

export const accountCategories: Record<AccountType, string[]> = {
  asset: ["Cash", "Investments", "House Value", "Car Value", "Other"],
  liability: ["Credit cards", "Car Loan", "Loans", "Mortgage", "Other"],
};

export const currentMonthStart = () =>
  `${new Date().toISOString().slice(0, 7)}-01`;
export const monthStartFromSlug = (slug: string) => {
  const match =
    /^(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{4})$/i.exec(
      slug,
    );
  if (!match) return null;
  const index = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ].indexOf(match[1].toLowerCase());
  return `${match[2]}-${String(index + 1).padStart(2, "0")}-01`;
};
export const monthOption = (date: string): MonthOption => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const name = parsed.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  return {
    slug: `${name.toLowerCase()}-${parsed.getUTCFullYear()}`,
    name: `${name} ${parsed.getUTCFullYear()}`,
  };
};
