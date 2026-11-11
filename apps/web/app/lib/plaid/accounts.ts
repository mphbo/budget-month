import "server-only";
import { type AccountBase, AccountSubtype, AccountType } from "plaid";
import {
  type AccountCategory,
  ASSET_CATEGORIES,
  type AccountType as BudgetAccountType,
  LIABILITY_CATEGORIES,
} from "../account-types";

export type LinkedAccountInput = {
  plaidAccountId: string;
  name: string;
  type: BudgetAccountType;
  category: AccountCategory;
  amount: string;
};

const maxAmount = 999_999_999_999.99;

const classifyAccount = (
  account: AccountBase,
): { type: BudgetAccountType; category: AccountCategory } => {
  switch (account.type) {
    case AccountType.Depository:
      return { type: "asset", category: ASSET_CATEGORIES.cash };
    case AccountType.Investment:
    case AccountType.Brokerage:
      return { type: "asset", category: ASSET_CATEGORIES.investments };
    case AccountType.Credit:
      return { type: "liability", category: LIABILITY_CATEGORIES.creditCards };
    case AccountType.Loan:
      if (
        account.subtype === AccountSubtype.Mortgage ||
        account.subtype === AccountSubtype.HomeEquity ||
        account.subtype === AccountSubtype.HomeEquityLoan
      ) {
        return { type: "liability", category: LIABILITY_CATEGORIES.mortgage };
      }
      if (account.subtype === AccountSubtype.Auto) {
        return {
          type: "liability",
          category: LIABILITY_CATEGORIES.vehicleLoan,
        };
      }
      return { type: "liability", category: LIABILITY_CATEGORIES.loans };
    default:
      return { type: "asset", category: ASSET_CATEGORIES.other };
  }
};

// Account balances are stored as non-negative magnitudes; the account type
// carries the sign. Overdrawn or overpaid balances are recorded as zero.
export const toBalanceAmount = (account: AccountBase) => {
  const balance = account.balances.current ?? account.balances.available ?? 0;
  return Math.min(Math.max(balance, 0), maxAmount).toFixed(2);
};

export const toLinkedAccountInput = (
  account: AccountBase,
  institutionName: string,
): LinkedAccountInput => {
  const mask = account.mask ? ` ••${account.mask}` : "";
  const baseName = `${institutionName} ${account.name}`.trim();

  return {
    plaidAccountId: account.account_id,
    name: `${baseName.slice(0, 120 - mask.length)}${mask}`,
    ...classifyAccount(account),
    amount: toBalanceAmount(account),
  };
};
