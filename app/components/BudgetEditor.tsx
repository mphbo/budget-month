"use client";

import SaveIcon from "@mui/icons-material/Save";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type {
  BudgetInput,
  BudgetSection,
  MonthBudget,
} from "../lib/month-types";
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
    income: budget.income.map(({ item, amount }) => ({ item, amount })),
    expenses: budget.expenses.map(({ item, amount }) => ({ item, amount })),
    equityChange: budget.equityChange.map(({ item, amount }) => ({
      item,
      amount,
    })),
    totalEquity: budget.totalEquity.map(({ item, amount }) => ({
      item,
      amount,
    })),
  };
};

const getBudgetSnapshot = (budget: BudgetInput) =>
  JSON.stringify(
    Object.fromEntries(
      (Object.keys(sectionTitles) as BudgetSection[]).map((section) => [
        section,
        budget[section].map(({ item, amount }) => ({
          item: item.trim(),
          amount: /^-?\d{1,12}(?:\.\d{1,2})?$/.test(amount)
            ? Number(amount).toFixed(2)
            : amount,
        })),
      ]),
    ),
  );

const getValidationError = (budget: EditableBudget) => {
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
}: {
  monthSlug: string;
  budget: MonthBudget;
}) => {
  const [draft, setDraft] = useState(() => createEditableBudget(budget));
  const [savedInput, setSavedInput] = useState(() =>
    getBudgetSnapshot(toBudgetInput(createEditableBudget(budget))),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState(0);

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
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const updateSection = (
    section: BudgetSection,
    items: EditableBudgetItem[],
  ) => {
    setDraft((current) => ({ ...current, [section]: items }));
    setError(null);
    setSavedMessage(null);
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
        const result: { error?: string } = await response.json();
        throw new Error(result.error ?? "Could not save this month's budget.");
      }

      setSavedInput(getBudgetSnapshot(input));
      setSavedVersion((version) => version + 1);
      setSavedMessage("Changes saved.");
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
      {savedMessage && <Alert severity="success">{savedMessage}</Alert>}
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
              disabled={isSaving}
              items={draft[section]}
              onChange={(items) => updateSection(section, items)}
              title={sectionTitles[section]}
            />
          </Grid>
        ))}
      </Grid>
      <div>
        <Button
          disabled={!isDirty || isSaving}
          onClick={() => void saveBudget()}
          startIcon={<SaveIcon />}
          variant="contained"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </Stack>
  );
};
