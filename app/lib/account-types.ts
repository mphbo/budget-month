export type AccountType = "asset" | "liability";

export const ACCOUNT_CATEGORIES: Record<AccountType, readonly string[]> = {
  asset: ["Cash", "Investments", "Fixed assets", "Other"],
  liability: ["Credit cards", "Loans", "Mortgage", "Other"],
};

export const getAccountCategories = (
  type: AccountType,
  currentCategory?: string,
): readonly string[] => {
  const categories = ACCOUNT_CATEGORIES[type];
  return currentCategory && !categories.some((item) => item === currentCategory)
    ? [currentCategory, ...categories]
    : categories;
};

export const getDefaultAccountCategory = (type: AccountType) =>
  ACCOUNT_CATEGORIES[type][0];

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  category: string;
  amount: number;
};

export type AccountInput = {
  name: string;
  type: AccountType;
  category: string;
  amount: string;
};

export type AccountUpdateInput = AccountInput & {
  id: string;
};
