import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type {
  Account,
  AccountInput,
  AccountType,
  AccountUpdateInput,
} from "./account-types";
import type {
  BudgetInput,
  MonthBudget,
  MonthCreateMode,
  MonthOption,
  NextMonthOption,
  PreviousMonthOption,
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

const currentMonthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

export const isCurrentMonth = (slug: string) =>
  dateFromSlug(slug) === currentMonthStart();

export const isFutureMonth = (slug: string) => {
  const monthStart = dateFromSlug(slug);
  return monthStart !== null && monthStart > currentMonthStart();
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

export const getDeletableMonthSlugs = (months: MonthOption[]) => {
  const currentMonth = currentMonthStart();
  const oldestPastMonth = months.find((month) => {
    const start = dateFromSlug(month.slug);
    return start !== null && start < currentMonth;
  });
  const newestFutureMonth = [...months].reverse().find((month) => {
    const start = dateFromSlug(month.slug);
    return start !== null && start > currentMonth;
  });

  return [oldestPastMonth?.slug, newestFutureMonth?.slug].filter(
    (slug): slug is string => slug !== undefined,
  );
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

export const getPreviousMonthOption = (
  months: MonthOption[],
): PreviousMonthOption | null => {
  const earliestMonth = months[0];
  if (!earliestMonth) {
    return null;
  }

  const earliestDate = dateFromSlug(earliestMonth.slug);
  if (!earliestDate) {
    throw new Error("The earliest budget month has an invalid date.");
  }

  const previousDate = new Date(`${earliestDate}T00:00:00.000Z`);
  previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);
  return {
    ...monthOption(previousDate.toISOString().slice(0, 10)),
    copyFrom: earliestMonth,
  };
};

export const getMonthNavigationData = cache(async () => {
  const months = await getMonthOptions();
  return {
    months,
    nextMonth: await getNextMonthOption(months),
    previousMonth: getPreviousMonthOption(months),
    deletableMonths: getDeletableMonthSlugs(months),
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

const getEquityChanges = (
  currentItems: MonthBudget["totalEquity"],
  previousItems: MonthBudget["totalEquity"],
): MonthBudget["equityChange"] => {
  const previousById = new Map(
    previousItems
      .filter((item) => item.accountId)
      .map((item) => [item.accountId as string, item]),
  );
  const previousWithoutIdByName = new Map<string, typeof previousItems>();
  const currentNameCounts = new Map<string, number>();

  for (const item of currentItems) {
    const name = item.item.trim().toLocaleLowerCase();
    currentNameCounts.set(name, (currentNameCounts.get(name) ?? 0) + 1);
  }
  for (const item of previousItems) {
    if (item.accountId) {
      continue;
    }

    const name = item.item.trim().toLocaleLowerCase();
    previousWithoutIdByName.set(name, [
      ...(previousWithoutIdByName.get(name) ?? []),
      item,
    ]);
  }

  const matchedPrevious = new Set<MonthBudget["totalEquity"][number]>();
  const changes: MonthBudget["equityChange"] = [];

  for (const current of currentItems) {
    let previous = current.accountId
      ? previousById.get(current.accountId)
      : undefined;
    if (!previous) {
      const name = current.item.trim().toLocaleLowerCase();
      const nameMatches = previousWithoutIdByName.get(name);
      if (currentNameCounts.get(name) === 1 && nameMatches?.length === 1) {
        previous = nameMatches[0];
      }
    }

    if (previous) {
      matchedPrevious.add(previous);
    }

    const changeCents =
      Math.round(current.amount * 100) -
      Math.round((previous?.amount ?? 0) * 100);
    if (changeCents !== 0) {
      changes.push({
        item: current.item,
        amount: changeCents / 100,
        ...(current.accountId ? { accountId: current.accountId } : {}),
      });
    }
  }

  for (const previous of previousItems) {
    if (!matchedPrevious.has(previous)) {
      const changeCents = -Math.round(previous.amount * 100);
      if (changeCents !== 0) {
        changes.push({
          item: previous.item,
          amount: changeCents / 100,
          ...(previous.accountId ? { accountId: previous.accountId } : {}),
        });
      }
    }
  }

  return changes;
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

export const saveAccounts = async (accounts: AccountUpdateInput[]) => {
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

export const createPreviousMonth = async (mode: MonthCreateMode) => {
  const { supabase } = await getAuthorizedSupabaseClient();
  const { data, error } = await supabase
    .rpc("create_previous_budget_month", { p_mode: mode })
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

  return monthOption(data.month_start);
};

export const deleteMonth = async (slug: string) => {
  const monthStart = dateFromSlug(slug);
  if (!monthStart) {
    return "invalid" as const;
  }

  const { supabase } = await getAuthorizedSupabaseClient();
  const { data, error } = await supabase.rpc("delete_budget_month", {
    p_month_start: monthStart,
  });

  if (error) {
    throw error;
  }

  if (data !== "deleted" && data !== "not_found" && data !== "not_deletable") {
    throw new Error("Month deletion returned an invalid database result.");
  }

  return data;
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
    .select("section, name, amount, position, account_id, scheduled_date")
    .eq("user_id", userId)
    .eq("month_id", month.id)
    .order("position", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const { data: previousMonth, error: previousMonthError } = await supabase
    .from("budget_months")
    .select("id")
    .eq("user_id", userId)
    .lt("month_start", month.month_start)
    .order("month_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousMonthError) {
    throw previousMonthError;
  }

  const { data: previousItems, error: previousItemsError } = previousMonth
    ? await supabase
        .from("budget_items")
        .select("section, name, amount, account_id")
        .eq("user_id", userId)
        .eq("month_id", previousMonth.id)
        .eq("section", "totalEquity")
    : { data: [], error: null };

  if (previousItemsError) {
    throw previousItemsError;
  }

  const isCurrent = month.month_start === currentMonthStart();
  const { data: accounts, error: accountsError } = isCurrent
    ? await supabase
        .from("account_items")
        .select("id, name, account_type, amount")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (accountsError) {
    throw accountsError;
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
    if (section && !(isCurrent && section === "totalEquity")) {
      budget[section].push({
        item: item.name,
        amount: Number(item.amount),
        ...(item.account_id ? { accountId: item.account_id } : {}),
        ...(item.scheduled_date ? { date: item.scheduled_date } : {}),
      });
    }
  }

  if (isCurrent) {
    budget.totalEquity = accounts.map((account) => ({
      item: account.name,
      amount:
        account.account_type === "liability"
          ? -Number(account.amount)
          : Number(account.amount),
      accountId: account.id,
    }));
  }

  const previousEquity = previousItems.map((item) => ({
    item: item.name,
    amount: Number(item.amount),
    ...(item.account_id ? { accountId: item.account_id } : {}),
  }));
  budget.equityChange = previousMonth
    ? getEquityChanges(budget.totalEquity, previousEquity)
    : [];

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
