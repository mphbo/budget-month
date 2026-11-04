export type AccountType = "asset" | "liability";

export const ASSET_CATEGORIES = {
  cash: "Cash",
  investments: "Investments",
  houseValue: "House Value",
  carValue: "Car Value",
  other: "Other",
} as const;

export const LIABILITY_CATEGORIES = {
  creditCards: "Credit cards",
  carLoan: "Car Loan",
  loans: "Loans",
  mortgage: "Mortgage",
  other: "Other",
} as const;

export type AssetCategory =
  (typeof ASSET_CATEGORIES)[keyof typeof ASSET_CATEGORIES];
export const FIXED_ASSET_CATEGORIES = [
  ASSET_CATEGORIES.houseValue,
  ASSET_CATEGORIES.carValue,
] as const;
export type FixedAssetCategory = (typeof FIXED_ASSET_CATEGORIES)[number];

export type LiabilityCategory =
  (typeof LIABILITY_CATEGORIES)[keyof typeof LIABILITY_CATEGORIES];
export type KnownAccountCategory = AssetCategory | LiabilityCategory;

declare const customAccountCategoryBrand: unique symbol;
type CustomAccountCategory = string & {
  readonly [customAccountCategoryBrand]: true;
};

export type AccountCategory = KnownAccountCategory | CustomAccountCategory;

export const isFixedAssetCategory = (category: AccountCategory) =>
  category === "Fixed assets" ||
  FIXED_ASSET_CATEGORIES.some(
    (fixedAssetCategory) => fixedAssetCategory === category,
  );

export const ACCOUNT_CATEGORIES: Record<
  AccountType,
  readonly KnownAccountCategory[]
> = {
  asset: Object.values(ASSET_CATEGORIES),
  liability: Object.values(LIABILITY_CATEGORIES),
};

export const isAccountCategory = (value: unknown): value is AccountCategory =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= 100;

export const parseAccountCategory = (value: unknown): AccountCategory => {
  if (!isAccountCategory(value)) {
    throw new Error("An account has an invalid category.");
  }

  return value;
};

export const hasDuplicateNames = (names: string[]) => {
  const seen = new Set<string>();
  for (const name of names) {
    const normalized = name.trim().toLowerCase();
    if (seen.has(normalized)) {
      return true;
    }
    seen.add(normalized);
  }
  return false;
};

export const getAccountCategories = (
  type: AccountType,
  currentCategory?: AccountCategory,
): readonly AccountCategory[] => {
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
  category: AccountCategory;
  amount: number;
};

export type AccountInput = {
  name: string;
  type: AccountType;
  category: AccountCategory;
  amount: string;
};

export type AccountUpdateInput = AccountInput & {
  id: string;
};
