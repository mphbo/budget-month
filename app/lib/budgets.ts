import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Account, AccountInput, AccountType } from "./account-types";
import type {
  BudgetInput,
  MonthBudget,
  MonthCreateMode,
  MonthOption,
  NextMonthOption,
} from "./month-types";
import { budgetSections } from "./month-types";
import { createSupabaseServerClient } from "./supabase/server";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getAuthorizedSupabaseClient = async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }

  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
};

const monthOption = (monthStart: string): MonthOption => {
  const date = new Date(`${monthStart}T00:00:00.000Z`);
  const monthName = monthNames[date.getUTCMonth()];

  return {
    slug: `${monthName.toLowerCase()}-${date.getUTCFullYear()}`,
    name: `${monthName} ${date.getUTCFullYear()}`,
  };
};

const dateFromSlug = (slug: string) => {
  const match =
    /^(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{4})$/i.exec(
      slug,
    );
  if (!match) {
    return null;
  }

  const monthIndex = monthNames.findIndex(
    (name) => name.toLowerCase() === match[1].toLowerCase(),
  );
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}-01`;
};

export const getMonthOptions = async (): Promise<MonthOption[]> => {
  const { supabase, userId } = await getAuthorizedSupabaseClient();
  const { data, error } = await supabase
    .from("budget_months")
    .select("month_start")
    .eq("user_id", userId)
    .order("month_start", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(({ month_start }) => monthOption(month_start));
};

export const getNextMonthOption = async (
  knownMonths?: MonthOption[],
): Promise<NextMonthOption> => {
  const months = knownMonths ?? (await getMonthOptions());
  const latestMonth = months.at(-1);
  const latestDate = latestMonth
    ? dateFromSlug(latestMonth.slug)
    : `${new Date().toISOString().slice(0, 7)}-01`;
  if (!latestDate) {
    throw new Error("The latest budget month has an invalid date.");
  }

  const previousDate = new Date(`${latestDate}T00:00:00.000Z`);
  previousDate.setUTCMonth(previousDate.getUTCMonth() + 1);
  const nextDate = previousDate.toISOString().slice(0, 10);
  const nextMonth = monthOption(nextDate);

  return {
    ...nextMonth,
    copyFrom: latestMonth ?? null,
  };
};

export const getMonthNavigationData = cache(async () => {
  const months = await getMonthOptions();
  return {
    months,
    nextMonth: await getNextMonthOption(months),
  };
});

export const getAccounts = async (): Promise<Account[]> => {
  const { supabase, userId } = await getAuthorizedSupabaseClient();
  const { data, error } = await supabase
    .from("account_items")
    .select("id, name, account_type, category, amount")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map((account) => {
    const type: AccountType = account.account_type;
    if (type !== "asset" && type !== "liability") {
      throw new Error("An account has an invalid type in the database.");
    }

    return {
      id: account.id,
      name: account.name,
      type,
      category: account.category,
      amount: Number(account.amount),
    };
  });
};

export const createAccount = async (
  account: AccountInput,
): Promise<Account> => {
  const { supabase } = await getAuthorizedSupabaseClient();
  const { data, error } = await supabase
    .rpc("create_account_item", {
      p_name: account.name.trim(),
      p_type: account.type,
      p_category: account.category.trim(),
      p_amount: account.amount,
    })
    .single();

  if (error) {
    throw error;
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    typeof data.id !== "string" ||
    !("name" in data) ||
    typeof data.name !== "string" ||
    !("account_type" in data) ||
    (data.account_type !== "asset" && data.account_type !== "liability") ||
    !("category" in data) ||
    typeof data.category !== "string" ||
    !("amount" in data)
  ) {
    throw new Error("Account creation returned an invalid database result.");
  }

  return {
    id: data.id,
    name: data.name,
    type: data.account_type,
    category: data.category,
    amount: Number(data.amount),
  };
};

export const saveAccounts = async (accounts: AccountInput[]) => {
  const { supabase } = await getAuthorizedSupabaseClient();
  const { error } = await supabase.rpc("save_account_items", {
    p_accounts: accounts,
  });

  if (error) {
    throw error;
  }
};

export const createNextMonth = async (mode: MonthCreateMode) => {
  const { supabase } = await getAuthorizedSupabaseClient();
  const { data, error } = await supabase
    .rpc("create_next_budget_month", { p_mode: mode })
    .single();

  if (error) {
    if (error.code === "23505") {
      return null;
    }

    throw error;
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("month_start" in data) ||
    typeof data.month_start !== "string"
  ) {
    throw new Error("Month creation returned an invalid database result.");
  }

  const option = monthOption(data.month_start);
  return option;
};

export const getMonthBudget = async (
  slug: string,
): Promise<MonthBudget | null> => {
  const monthStart = dateFromSlug(slug);
  if (!monthStart) {
    return null;
  }

  const { supabase, userId } = await getAuthorizedSupabaseClient();
  const { data: month, error: monthError } = await supabase
    .from("budget_months")
    .select("id, month_start")
    .eq("user_id", userId)
    .eq("month_start", monthStart)
    .maybeSingle();

  if (monthError) {
    throw monthError;
  }
  if (!month) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("budget_items")
    .select("section, name, amount, position")
    .eq("user_id", userId)
    .eq("month_id", month.id)
    .order("position", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const budget: MonthBudget = {
    name: monthOption(month.month_start).name,
    income: [],
    expenses: [],
    equityChange: [],
    totalEquity: [],
  };

  for (const item of items) {
    const section = budgetSections.find(
      (knownSection) => knownSection === item.section,
    );
    if (section) {
      budget[section].push({
        item: item.name,
        amount: Number(item.amount),
      });
    }
  }

  return budget;
};

export const saveMonthBudget = async (slug: string, budget: BudgetInput) => {
  const monthStart = dateFromSlug(slug);
  if (!monthStart) {
    return false;
  }

  const { supabase } = await getAuthorizedSupabaseClient();
  const { error } = await supabase.rpc("save_budget_month", {
    p_month_start: monthStart,
    p_budget: budget,
  });

  if (error) {
    throw error;
  }

  return true;
};
