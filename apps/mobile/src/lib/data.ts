import { getSupabase } from "./supabase";
import {
  type Account,
  type AccountType,
  type BudgetInput,
  type BudgetItem,
  currentMonthStart,
  type EquityHistoryPoint,
  type MonthBudget,
  type MonthOption,
  monthOption,
  monthStartFromSlug,
} from "./types";

const requireUserId = async () => {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Please sign in again.");
  return data.user.id;
};

export async function getAccounts(): Promise<Account[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("account_items")
    .select("id, name, account_type, category, amount")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.account_type as AccountType,
    category: account.category,
    amount: Number(account.amount),
  }));
}

export async function getMonths(): Promise<MonthOption[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("budget_months")
    .select("month_start")
    .eq("user_id", userId)
    .order("month_start", { ascending: true });
  if (error) throw error;
  return data.map(({ month_start }) => monthOption(month_start));
}

export function getDeletableMonths(months: MonthOption[]) {
  const current = currentMonthStart();
  const oldestPast = months.find((month) => {
    const date = monthStartFromSlug(month.slug);
    return date !== null && date < current;
  });
  const newestFuture = [...months].reverse().find((month) => {
    const date = monthStartFromSlug(month.slug);
    return date !== null && date > current;
  });
  return [oldestPast?.slug, newestFuture?.slug].filter(
    (slug): slug is string => slug !== undefined,
  );
}

export async function getEquityHistory(
  accounts: Account[],
): Promise<EquityHistoryPoint[]> {
  const userId = await requireUserId();
  const { data: months, error: monthsError } = await getSupabase()
    .from("budget_months")
    .select("id, month_start")
    .eq("user_id", userId)
    .order("month_start", { ascending: true });
  if (monthsError) throw monthsError;
  const historicalMonths = months.filter(
    (month) => month.month_start <= currentMonthStart(),
  );
  if (historicalMonths.length === 0) return [];

  const { data: items, error } = await getSupabase()
    .from("budget_items")
    .select("month_id, account_id, account_type, category, amount")
    .eq("user_id", userId)
    .eq("section", "totalEquity")
    .in(
      "month_id",
      historicalMonths.map((month) => month.id),
    );
  if (error) throw error;

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const itemsByMonth = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByMonth.get(item.month_id) ?? [];
    list.push(item);
    itemsByMonth.set(item.month_id, list);
  }

  return historicalMonths.map((month) => {
    const categoryValues: Record<string, number> = {};
    const snapshotItems =
      month.month_start === currentMonthStart()
        ? []
        : (itemsByMonth.get(month.id) ?? []);
    for (const item of snapshotItems) {
      const account = item.account_id
        ? accountById.get(item.account_id)
        : undefined;
      const type = account?.type ?? item.account_type;
      const category = account?.category ?? item.category;
      if (!type || !category) continue;
      const key = `${type}:${category}`;
      const amount =
        type === "liability"
          ? -Math.abs(Number(item.amount))
          : Math.abs(Number(item.amount));
      categoryValues[key] = (categoryValues[key] ?? 0) + amount;
    }

    if (month.month_start === currentMonthStart()) {
      for (const account of accounts) {
        const key = `${account.type}:${account.category}`;
        const amount =
          account.type === "liability" ? -account.amount : account.amount;
        categoryValues[key] = (categoryValues[key] ?? 0) + amount;
      }
    }
    return { month: monthOption(month.month_start).name, categoryValues };
  });
}

const getEquityChanges = (
  current: BudgetItem[],
  previous: BudgetItem[],
): BudgetItem[] => {
  const previousById = new Map(
    previous
      .filter((item) => item.accountId)
      .map((item) => [item.accountId as string, item]),
  );
  const previousByName = new Map<string, BudgetItem[]>();
  const currentNameCounts = new Map<string, number>();
  for (const item of current) {
    const key = item.item.trim().toLowerCase();
    currentNameCounts.set(key, (currentNameCounts.get(key) ?? 0) + 1);
  }
  for (const item of previous) {
    const key = item.item.trim().toLowerCase();
    previousByName.set(key, [...(previousByName.get(key) ?? []), item]);
  }
  const matchedPrevious = new Set<BudgetItem>();
  const changes: BudgetItem[] = [];
  for (const item of current) {
    const key = item.item.trim().toLowerCase();
    const matches = previousByName.get(key);
    let before =
      currentNameCounts.get(key) === 1 && matches?.length === 1
        ? matches[0]
        : undefined;
    if (!before && item.accountId) {
      before = previousById.get(item.accountId);
    }
    if (before) matchedPrevious.add(before);
    const change =
      Math.round(item.amount * 100) - Math.round((before?.amount ?? 0) * 100);
    if (change) {
      changes.push({
        item: item.item,
        amount: change / 100,
        ...(item.accountId ? { accountId: item.accountId } : {}),
      });
    }
  }
  for (const item of previous) {
    if (matchedPrevious.has(item)) continue;
    const change = -Math.round(item.amount * 100);
    if (change) {
      changes.push({
        item: item.item,
        amount: change / 100,
        ...(item.accountId ? { accountId: item.accountId } : {}),
      });
    }
  }
  return changes;
};

export async function getMonthBudget(slug: string): Promise<MonthBudget> {
  const monthStart = monthStartFromSlug(slug);
  if (!monthStart) throw new Error("That month URL is invalid.");
  const userId = await requireUserId();
  const supabase = getSupabase();
  const { data: month, error: monthError } = await supabase
    .from("budget_months")
    .select("id, month_start")
    .eq("user_id", userId)
    .eq("month_start", monthStart)
    .maybeSingle();
  if (monthError) throw monthError;
  if (!month) throw new Error("This budget month could not be found.");

  const [
    { data: rows, error: rowsError },
    { data: previousMonth, error: previousMonthError },
    accounts,
  ] = await Promise.all([
    supabase
      .from("budget_items")
      .select(
        "section, name, amount, account_id, account_type, category, scheduled_date",
      )
      .eq("user_id", userId)
      .eq("month_id", month.id)
      .order("position", { ascending: true }),
    supabase
      .from("budget_months")
      .select("id")
      .eq("user_id", userId)
      .lt("month_start", month.month_start)
      .order("month_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getAccounts(),
  ]);
  if (rowsError) throw rowsError;
  if (previousMonthError) throw previousMonthError;

  const previousRows = previousMonth
    ? await supabase
        .from("budget_items")
        .select("name, amount, account_id")
        .eq("user_id", userId)
        .eq("month_id", previousMonth.id)
        .eq("section", "totalEquity")
    : { data: [], error: null };
  if (previousRows.error) throw previousRows.error;

  const isCurrent = month.month_start === currentMonthStart();
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const budget: MonthBudget = {
    name: monthOption(month.month_start).name,
    income: [],
    expenses: [],
    equityChange: [],
    totalEquity: [],
  };

  for (const row of rows) {
    if (isCurrent && row.section === "totalEquity") continue;
    if (!(row.section in budget)) continue;
    const account = row.account_id
      ? accountById.get(row.account_id)
      : undefined;
    const type = account?.type ?? (row.account_type as AccountType | null);
    const amount =
      row.section === "totalEquity" && type === "liability"
        ? -Math.abs(Number(row.amount))
        : Number(row.amount);
    const budgetItem: BudgetItem = {
      item: row.name,
      amount,
      ...(row.account_id ? { accountId: row.account_id } : {}),
      ...(type ? { accountType: type } : {}),
      ...((account?.category ?? row.category)
        ? { category: account?.category ?? row.category ?? undefined }
        : {}),
      ...(row.scheduled_date ? { date: row.scheduled_date } : {}),
    };
    if (row.section === "income") budget.income.push(budgetItem);
    else if (row.section === "expenses") budget.expenses.push(budgetItem);
    else if (row.section === "equityChange") {
      budget.equityChange.push(budgetItem);
    } else if (row.section === "totalEquity") {
      budget.totalEquity.push(budgetItem);
    }
  }

  if (isCurrent) {
    budget.totalEquity = accounts.map((account) => ({
      item: account.name,
      amount: account.type === "liability" ? -account.amount : account.amount,
      accountId: account.id,
      accountType: account.type,
      category: account.category,
    }));
  }

  const previousEquity = (previousRows.data ?? []).map((row) => {
    const account = row.account_id
      ? accountById.get(row.account_id)
      : undefined;
    return {
      item: row.name,
      amount:
        account?.type === "liability"
          ? -Math.abs(Number(row.amount))
          : account
            ? Math.abs(Number(row.amount))
            : Number(row.amount),
      ...(row.account_id ? { accountId: row.account_id } : {}),
    };
  });
  budget.equityChange = previousMonth
    ? getEquityChanges(budget.totalEquity, previousEquity)
    : [];
  return budget;
}

export async function createAccount(input: {
  name: string;
  type: AccountType;
  category: string;
  amount: string;
}): Promise<Account> {
  const { data, error } = await getSupabase()
    .rpc("create_account_item", {
      p_name: input.name.trim(),
      p_type: input.type,
      p_category: input.category.trim(),
      p_amount: input.amount,
    })
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    type: data.account_type as AccountType,
    category: data.category,
    amount: Number(data.amount),
  };
}

export async function saveAccounts(accounts: (Account & { amount: number })[]) {
  const { error } = await getSupabase().rpc("save_account_items", {
    p_accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name.trim(),
      type: account.type,
      category: account.category.trim(),
      amount: account.amount.toFixed(2),
    })),
  });
  if (error) throw error;
}

export async function createMonth(
  direction: "previous" | "next",
  mode: "copy" | "fresh",
) {
  const { data, error } = await getSupabase()
    .rpc(
      direction === "previous"
        ? "create_previous_budget_month"
        : "create_next_budget_month",
      { p_mode: mode },
    )
    .single();
  if (error) throw error;
  return monthOption(data.month_start);
}

export async function deleteMonth(slug: string) {
  const monthStart = monthStartFromSlug(slug);
  if (!monthStart) throw new Error("That month URL is invalid.");
  const { data, error } = await getSupabase().rpc("delete_budget_month", {
    p_month_start: monthStart,
  });
  if (error) throw error;
  if (data === "not_deletable") {
    throw new Error(
      "Only the oldest past month or newest future month can be deleted.",
    );
  }
  if (data === "not_found") throw new Error("This month could not be found.");
}

export async function saveMonthBudget(slug: string, budget: BudgetInput) {
  const monthStart = monthStartFromSlug(slug);
  if (!monthStart) throw new Error("That month URL is invalid.");
  const classifications = [
    ...new Map(
      budget.totalEquity.flatMap((item) =>
        item.accountId && item.accountType && item.category
          ? [
              [
                item.accountId,
                {
                  accountId: item.accountId,
                  accountType: item.accountType,
                  category: item.category,
                },
              ] as const,
            ]
          : [],
      ),
    ).values(),
  ];
  const { error } = await getSupabase().rpc(
    "save_budget_month_with_account_classifications",
    {
      p_month_start: monthStart,
      p_budget: Object.fromEntries(
        Object.entries(budget).map(([section, items]) => [
          section,
          items.map(({ item, amount, date, accountId }) => ({
            item,
            amount: typeof amount === "number" ? amount.toFixed(2) : amount,
            ...(date ? { date } : {}),
            ...(accountId ? { accountId } : {}),
          })),
        ]),
      ),
      p_classifications: classifications,
    },
  );
  if (error) throw error;
}

export function getNextMonth(months: MonthOption[]) {
  const latest = months.at(-1);
  if (!latest) {
    return { ...monthOption(currentMonthStart()), copyFrom: null };
  }
  const latestStart = latest
    ? monthStartFromSlug(latest.slug)
    : currentMonthStart();
  if (!latestStart) throw new Error("The latest budget month is invalid.");
  const date = new Date(`${latestStart}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return { ...monthOption(date.toISOString().slice(0, 10)), copyFrom: latest };
}

export function getPreviousMonth(months: MonthOption[]) {
  const earliest = months[0];
  if (!earliest) return null;
  const dateString = monthStartFromSlug(earliest.slug);
  if (!dateString) throw new Error("The earliest budget month is invalid.");
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return {
    ...monthOption(date.toISOString().slice(0, 10)),
    copyFrom: earliest,
  };
}
