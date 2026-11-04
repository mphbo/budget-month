import type { BudgetSection } from "../../../../lib/month-types";

import { type Account, type AccountInput } from "../../../../lib/account-types";

import { type EditableBudgetItem } from "./components/DataTable";

export type EditableBudget = Record<BudgetSection, EditableBudgetItem[]>;

export type StagedAccount = {
  itemId: string;
  input: AccountInput;
  createdAccount?: Account;
};
export type SaveStepStatus = "pending" | "active" | "complete" | "error";
export type SaveStep = {
  id: string;
  label: string;
  status: SaveStepStatus;
  error?: string;
};
