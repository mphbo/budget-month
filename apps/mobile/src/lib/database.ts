import type { AccountType } from "./types";

type AccountItemRow = {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  category: string;
  amount: number;
  sort_order: number;
  created_at: string;
};

type BudgetMonthRow = {
  id: string;
  user_id: string;
  month_start: string;
  created_at: string;
};

type BudgetItemRow = {
  id: string;
  month_id: string;
  user_id: string;
  section: string;
  name: string;
  amount: number;
  position: number;
  created_at: string;
  account_id: string | null;
  account_type: AccountType | null;
  category: string | null;
  scheduled_date: string | null;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.1" };
  public: {
    Tables: {
      account_items: {
        Row: AccountItemRow;
        Insert: Omit<AccountItemRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AccountItemRow>;
        Relationships: [];
      };
      budget_months: {
        Row: BudgetMonthRow;
        Insert: Omit<BudgetMonthRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<BudgetMonthRow>;
        Relationships: [];
      };
      budget_items: {
        Row: BudgetItemRow;
        Insert: Omit<BudgetItemRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<BudgetItemRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_account_item: {
        Args: {
          p_name: string;
          p_type: string;
          p_category: string;
          p_amount: number | string;
        };
        Returns: {
          id: string;
          name: string;
          account_type: string;
          category: string;
          amount: number;
          sort_order: number;
        }[];
      };
      save_account_items: {
        Args: { p_accounts: unknown };
        Returns: undefined;
      };
      create_next_budget_month: {
        Args: { p_mode: string };
        Returns: { month_id: string; month_start: string }[];
      };
      create_previous_budget_month: {
        Args: { p_mode: string };
        Returns: { month_id: string; month_start: string }[];
      };
      delete_budget_month: {
        Args: { p_month_start: string };
        Returns: string;
      };
      save_budget_month_with_account_classifications: {
        Args: {
          p_month_start: string;
          p_budget: unknown;
          p_classifications: unknown;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
