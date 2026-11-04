"use client";

import SaveIcon from "@mui/icons-material/Save";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Account, hasDuplicateNames } from "../lib/account-types";
import { getApiErrorMessage, readApiJson } from "../lib/api-response";
import { formatCurrency } from "../lib/formatting";
import type {
  BudgetInput,
  BudgetSection,
  MonthBudget,
} from "../lib/month-types";
import { AddAccountDialog } from "./AddAccountDialog";
import { DataTable, type EditableBudgetItem } from "./DataTable";

type EditableBudget = Record<BudgetSection, EditableBudgetItem[]>;

const sectionTitles: Record<BudgetSection, string> = {
  income: "Income",
  expenses: "Expenses",
  equityChange: "Equity Change",
  totalEquity: "Total Equity",
};

const createEditableBudget = (budget: MonthBudget): EditableBudget => {
  return {
    income: budget.income.map((entry, index) => ({
      ...entry,
      id: `income-${index}`,
      amount: entry.amount.toFixed(2),
    })),
    expenses: budget.expenses.map((entry, index) => ({
      ...entry,
      id: `expenses-${index}`,
      amount: entry.amount.toFixed(2),
    })),
    equityChange: budget.equityChange.map((entry, index) => ({
      ...entry,
      id: `equityChange-${index}`,
      amount: entry.amount.toFixed(2),
    })),
    totalEquity: budget.totalEquity.map((entry, index) => ({
      ...entry,
      id: `totalEquity-${index}`,
      amount: entry.amount.toFixed(2),
    })),
  };
};

const toBudgetInput = (budget: EditableBudget): BudgetInput => {
  return {
    income: budget.income.map(({ item, amount, date }) => ({
      item,
      amount,
      ...(date ? { date } : {}),
    })),
    expenses: budget.expenses.map(({ item, amount, date }) => ({
      item,
      amount,
      ...(date ? { date } : {}),
    })),
    equityChange: budget.equityChange.map(({ item, amount }) => ({
      item,
      amount,
    })),
    totalEquity: budget.totalEquity.map(
      ({ item, amount, accountId, accountType, category }) => ({
        item,
        amount,
        ...(accountId ? { accountId } : {}),
        ...(accountType ? { accountType } : {}),
        ...(category ? { category } : {}),
      }),
    ),
  };
};

const getBudgetSnapshot = (budget: BudgetInput) =>
  JSON.stringify(
    Object.fromEntries(
      (Object.keys(sectionTitles) as BudgetSection[]).map((section) => [
        section,
        budget[section].map(
          ({ item, amount, accountId, accountType, category, date }) => ({
            item: item.trim(),
            amount: /^-?\d{1,12}(?:\.\d{1,2})?$/.test(amount)
              ? Number(amount).toFixed(2)
              : amount,
            ...(accountId ? { accountId } : {}),
            ...(accountType ? { accountType } : {}),
            ...(category ? { category } : {}),
            ...(date ? { date } : {}),
          }),
        ),
      ]),
    ),
  );

const getValidationError = (budget: EditableBudget) => {
  if (hasDuplicateNames(budget.totalEquity.map((entry) => entry.item))) {
    return "Total Equity item names must be unique in this month, ignoring capitalization.";
  }

  for (const section of Object.keys(sectionTitles) as BudgetSection[]) {
    for (const entry of budget[section]) {
      if (!entry.item.trim() || entry.item.trim().length > 200) {
        return "Each row needs an item name of 1 to 200 characters.";
      }
      if (!/^-?\d{1,12}(?:\.\d{1,2})?$/.test(entry.amount)) {
        return "Amounts must have up to 12 digits and 2 decimal places.";
      }
    }
    if (budget[section].length > 100) {
      return "Each table can contain up to 100 rows.";
    }
  }

  return null;
};

export const BudgetEditor = ({
  monthSlug,
  budget,
  isCurrentMonth,
  isFutureMonth,
}: {
  monthSlug: string;
  budget: MonthBudget;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}) => {
  const router = useRouter();
  const [draft, setDraft] = useState(() => createEditableBudget(budget));
  const [savedInput, setSavedInput] = useState(() =>
    getBudgetSnapshot(toBudgetInput(createEditableBudget(budget))),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState(0);
  const [isAddingEquityItem, setIsAddingEquityItem] = useState(false);

  const currentInput = getBudgetSnapshot(toBudgetInput(draft));
  const isDirty = currentInput !== savedInput;
  const incomeTotal = draft.income.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const expensesTotal = draft.expenses.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const monthlyDifference = incomeTotal - expensesTotal;
  const differenceLabel =
    monthlyDifference > 0
      ? "Surplus"
      : monthlyDifference < 0
        ? "Deficit"
        : "Balance";
  const differenceColor =
    monthlyDifference > 0
      ? "success.main"
      : monthlyDifference < 0
        ? "error.main"
        : "text.primary";
  const updateSection = (
    section: BudgetSection,
    items: EditableBudgetItem[],
  ) => {
    setDraft((current) => {
      if (section !== "totalEquity" || !isCurrentMonth) {
        return { ...current, [section]: items };
      }

      const equityChanges = new Map(
        current.equityChange
          .filter((entry) => entry.accountId)
          .map((entry) => [entry.accountId as string, entry]),
      );
      const nextItemsByAccountId = new Map(
        items
          .filter((entry) => entry.accountId)
          .map((entry) => [entry.accountId as string, entry]),
      );

      for (const previous of current.totalEquity) {
        if (!previous.accountId) {
          continue;
        }

        const change = equityChanges.get(previous.accountId);
        const next = nextItemsByAccountId.get(previous.accountId);
        const previousAmount =
          Number(previous.amount) - Number(change?.amount ?? 0);
        const adjustedPreviousAmount =
          next?.accountType && next.accountType !== previous.accountType
            ? next.accountType === "liability"
              ? -Math.abs(previousAmount)
              : Math.abs(previousAmount)
            : previousAmount;
        const nextChange = next
          ? Number(next.amount) - adjustedPreviousAmount
          : -previousAmount;

        if (nextChange === 0) {
          equityChanges.delete(previous.accountId);
        } else {
          equityChanges.set(previous.accountId, {
            accountId: previous.accountId,
            item: next?.item ?? change?.item ?? previous.item,
            amount: nextChange.toFixed(2),
            id: change?.id ?? `equity-change-${previous.accountId}`,
          });
        }
      }

      return {
        ...current,
        totalEquity: items,
        equityChange: [
          ...Array.from(equityChanges.values()),
          ...current.equityChange.filter((entry) => !entry.accountId),
        ],
      };
    });
    setError(null);
    setSavedMessage(null);
  };

  const handleEquityAccountCreated = async (_account: Account) => {
    try {
      const response = await fetch(
        `/api/months/${encodeURIComponent(monthSlug)}`,
      );
      if (!response.ok) {
        throw new Error(
          "The account was added, but Total Equity could not refresh. Reload this page.",
        );
      }

      const refreshedBudget = await readApiJson<MonthBudget>(
        response,
        "Could not read the refreshed budget",
      );
      const refreshedDraft = createEditableBudget(refreshedBudget);
      setDraft(refreshedDraft);
      setSavedInput(getBudgetSnapshot(toBudgetInput(refreshedDraft)));
      setError(null);
      setSavedMessage("Account added and synced with Total Equity.");
      setIsAddingEquityItem(false);
      router.refresh();
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "The account was added, but Total Equity could not refresh. Reload this page.",
      );
      setSavedMessage(null);
    }
  };

  const saveBudget = async () => {
    const validationError = getValidationError(draft);
    if (validationError) {
      setError(validationError);
      setSavedMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const input = toBudgetInput(draft);
      const response = await fetch(
        `/api/months/${encodeURIComponent(monthSlug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget: input }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Could not save this month's budget",
          ),
        );
      }

      setSavedInput(getBudgetSnapshot(input));
      setSavedVersion((version) => version + 1);
      setSavedMessage(
        isCurrentMonth
          ? "Changes saved and account balances synced."
          : "Changes saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this month's budget.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={5}>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper
        aria-label="Monthly income and expense summary"
        component="section"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
        }}
      >
        <Typography sx={{ mb: 2 }} variant="h6">
          Cash Flow
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography color="text.secondary" variant="body2">
              Income
            </Typography>
            <Typography variant="h6">{formatCurrency(incomeTotal)}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography color="text.secondary" variant="body2">
              Expenses
            </Typography>
            <Typography variant="h6">
              {formatCurrency(expensesTotal)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography color="text.secondary" variant="body2">
              {differenceLabel}
            </Typography>
            <Typography color={differenceColor} variant="h6">
              {formatCurrency(Math.abs(monthlyDifference))}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      <Grid
        container
        columnSpacing={{ xs: 0, md: 10 }}
        rowSpacing={{ xs: 2, md: 5 }}
      >
        {(Object.keys(sectionTitles) as BudgetSection[]).map((section) => (
          <Grid key={`${section}-${savedVersion}`} size={{ xs: 12, md: 6 }}>
            <DataTable
              accountSynced={isCurrentMonth && section === "totalEquity"}
              showAccountClassification={section === "totalEquity"}
              disabled={isSaving}
              items={draft[section]}
              onChange={(items) => updateSection(section, items)}
              showDate={section === "income" || section === "expenses"}
              onAddItem={
                isCurrentMonth && section === "totalEquity"
                  ? () => setIsAddingEquityItem(true)
                  : undefined
              }
              addDisabled={
                isCurrentMonth &&
                section === "totalEquity" &&
                (isDirty || isAddingEquityItem)
              }
              readOnly={section === "equityChange"}
              title={sectionTitles[section]}
              titleTooltip={
                section === "totalEquity"
                  ? isCurrentMonth
                    ? "This month’s equity balances are synced with Accounts. Edit balances or delete accounts here; liabilities are negative. Type and category changes update the account globally across all months when saved."
                    : isFutureMonth
                      ? "This is a planned equity estimate for a future month. Balance changes do not sync with Accounts, but type and category changes update the account globally across all months when saved."
                      : "This is a historical snapshot. Balance changes do not affect Accounts, but type and category changes update the account globally across all months when saved."
                  : section === "equityChange"
                    ? "Calculated per item as this month’s Total Equity minus the previous month’s Total Equity. Positive amounts are increases; negative amounts are decreases."
                    : undefined
              }
            />
          </Grid>
        ))}
      </Grid>
      {isCurrentMonth && (
        <AddAccountDialog
          existingNames={draft.totalEquity.map((entry) => entry.item)}
          onClose={() => setIsAddingEquityItem(false)}
          onCreated={(account) => void handleEquityAccountCreated(account)}
          open={isAddingEquityItem}
        />
      )}
      <Alert severity="info">
        {isCurrentMonth
          ? "Total Equity balances sync with Accounts for this month. Add, edit, or delete accounts here, or manage accounts on the home page. Liabilities are negative. Type and category changes update the account globally across all months when saved. Equity Change compares this month with the previous month."
          : isFutureMonth
            ? "Total Equity is a planned estimate for this future month and does not sync with Accounts. Type and category changes update the account globally across all months when saved. Equity Change compares it with the previous month's Total Equity."
            : "This month is a historical snapshot. Balance edits won't affect Accounts, but type and category changes update the account globally across all months when saved. Equity Change compares its Total Equity with the previous month's snapshot."}
      </Alert>
      {savedMessage && <Alert severity="success">{savedMessage}</Alert>}
      <div>
        <Button
          disabled={!isDirty || isSaving}
          onClick={() => void saveBudget()}
          startIcon={<SaveIcon />}
          variant="contained"
        >
          {isSaving
            ? "Saving..."
            : isCurrentMonth && isDirty
              ? "Save changes and sync Accounts"
              : "Save changes"}
        </Button>
      </div>
    </Stack>
  );
};
