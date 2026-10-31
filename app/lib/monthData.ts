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

const mockMonthBudgets: Record<string, MonthBudget> = {
  november: {
    name: "November",
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
  december: {
    name: "December",
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
  january: {
    name: "January",
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
  february: {
    name: "February",
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
};

export function getAvailableMonths() {
  return Object.keys(mockMonthBudgets);
}

export async function getMonthBudget(month: string) {
  return mockMonthBudgets[month.toLowerCase()] ?? null;
}
