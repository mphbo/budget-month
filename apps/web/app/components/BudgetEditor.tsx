"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  type Account,
  type AccountInput,
  hasDuplicateNames,
} from "../lib/account-types";
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
type StagedAccount = {
  itemId: string;
  input: AccountInput;
  createdAccount?: Account;
};
type SaveStepStatus = "pending" | "active" | "complete" | "error";
type SaveStep = {
  id: string;
  label: string;
  status: SaveStepStatus;
  error?: string;
};

const signedAmount = (accountType: AccountInput["type"], amount: string) =>
  (accountType === "liability"
    ? -Math.abs(Number(amount))
    : Number(amount)
  ).toFixed(2);

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

const getBudgetSectionSnapshot = (items: BudgetInput[BudgetSection]) =>
  JSON.stringify(
    items.map(({ item, amount, accountId, accountType, category, date }) => ({
      item: item.trim(),
      amount: /^-?\d{1,12}(?:\.\d{1,2})?$/.test(amount)
        ? Number(amount).toFixed(2)
        : amount,
      ...(accountId ? { accountId } : {}),
      ...(accountType ? { accountType } : {}),
      ...(category ? { category } : {}),
      ...(date ? { date } : {}),
    })),
  );

const getBudgetSectionSnapshots = (
  budget: BudgetInput,
): Record<BudgetSection, string> => ({
  income: getBudgetSectionSnapshot(budget.income),
  expenses: getBudgetSectionSnapshot(budget.expenses),
  equityChange: getBudgetSectionSnapshot(budget.equityChange),
  totalEquity: getBudgetSectionSnapshot(budget.totalEquity),
});

const getBudgetSnapshot = (budget: BudgetInput) =>
  JSON.stringify(getBudgetSectionSnapshots(budget));

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
  const [savedDraft, setSavedDraft] = useState(() =>
    createEditableBudget(budget),
  );
  const savedDraftRef = useRef(savedDraft);
  savedDraftRef.current = savedDraft;
  const [savedInput, setSavedInput] = useState(() =>
    getBudgetSnapshot(toBudgetInput(createEditableBudget(budget))),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState(0);
  const [isAddingEquityItem, setIsAddingEquityItem] = useState(false);
  const [stagedAccounts, setStagedAccounts] = useState<StagedAccount[]>([]);
  const [saveSteps, setSaveSteps] = useState<SaveStep[]>([]);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);

  const currentSectionSnapshots = getBudgetSectionSnapshots(
    toBudgetInput(draft),
  );
  const savedSectionSnapshots = JSON.parse(savedInput) as Record<
    BudgetSection,
    string
  >;
  const currentInput = JSON.stringify(currentSectionSnapshots);
  const isDirty = currentInput !== savedInput;
  const hasCreatedStagedAccount = stagedAccounts.some(
    (staged) => staged.createdAccount,
  );
  const cancelChanges = () => {
    setDraft(savedDraft);
    setStagedAccounts([]);
    setError(null);
    setSavedMessage(null);
    setIsAddingEquityItem(false);
    setIsProgressDialogOpen(false);
  };

  useLayoutEffect(
    () => () => {
      setDraft(savedDraftRef.current);
      setError(null);
      setSavedMessage(null);
      setIsAddingEquityItem(false);
      setStagedAccounts([]);
      setIsProgressDialogOpen(false);
    },
    [],
  );
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

  const handleEquityAccountStaged = (account: AccountInput) => {
    const itemId = crypto.randomUUID();
    const item: EditableBudgetItem = {
      id: itemId,
      item: account.name,
      amount: signedAmount(account.type, account.amount),
      accountType: account.type,
      category: account.category,
    };
    setStagedAccounts((current) => [...current, { itemId, input: account }]);
    updateSection("totalEquity", [...draft.totalEquity, item]);
    setIsAddingEquityItem(false);
  };

  const saveBudget = async () => {
    const validationError = getValidationError(draft);
    if (validationError) {
      setError(validationError);
      setSavedMessage(null);
      return;
    }

    let remainingStagedAccounts = stagedAccounts.flatMap((staged) => {
      const item = draft.totalEquity.find(
        (entry) => entry.id === staged.itemId,
      );
      if (!item) {
        return [];
      }

      if (staged.createdAccount) {
        return [staged];
      }

      return [
        {
          ...staged,
          input: {
            name: item.item.trim(),
            type: item.accountType ?? staged.input.type,
            category: item.category ?? staged.input.category,
            amount: Math.abs(Number(item.amount)).toFixed(2),
          },
        },
      ];
    });
    const refreshStepId = "refresh-total-equity";
    const budgetStepId = "save-budget";
    const initialSteps: SaveStep[] = [
      ...remainingStagedAccounts.map((staged) => ({
        id: `account-${staged.itemId}`,
        label: `Add ${staged.input.name}`,
        status: staged.createdAccount
          ? ("complete" as const)
          : ("pending" as const),
      })),
      ...(remainingStagedAccounts.length > 0
        ? [
            {
              id: refreshStepId,
              label: "Refresh Total Equity and Equity Change",
              status: "pending" as const,
            },
          ]
        : []),
      {
        id: budgetStepId,
        label: "Save month changes",
        status: "pending",
      },
    ];
    setSaveSteps(initialSteps);
    setIsProgressDialogOpen(true);
    setIsSaving(true);
    setError(null);
    setSavedMessage(null);
    let activeStepId = initialSteps[0].id;
    const setStepStatus = (
      stepId: string,
      status: SaveStepStatus,
      stepError?: string,
    ) => {
      setSaveSteps((current) =>
        current.map((step) =>
          step.id === stepId
            ? { ...step, status, ...(stepError ? { error: stepError } : {}) }
            : step,
        ),
      );
    };

    try {
      let workingDraft = draft;
      setStagedAccounts(remainingStagedAccounts);

      for (const staged of remainingStagedAccounts) {
        const stepId = `account-${staged.itemId}`;
        activeStepId = stepId;
        if (staged.createdAccount) {
          setStepStatus(stepId, "complete");
          continue;
        }

        setStepStatus(stepId, "active");
        const response = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: staged.input }),
        });
        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              `Could not add account ${staged.input.name}`,
            ),
          );
        }

        const result = await readApiJson<{ account: Account }>(
          response,
          `Could not read the response after adding ${staged.input.name}`,
        );
        const createdItem: EditableBudgetItem = {
          id: staged.itemId,
          item: result.account.name,
          amount: signedAmount(
            result.account.type,
            String(result.account.amount),
          ),
          accountId: result.account.id,
          accountType: result.account.type,
          category: result.account.category,
        };
        workingDraft = {
          ...workingDraft,
          totalEquity: workingDraft.totalEquity.map((item) =>
            item.id === staged.itemId ? createdItem : item,
          ),
        };
        setDraft(workingDraft);

        const savedBase = savedDraftRef.current;
        const nextSavedBase: EditableBudget = {
          ...savedBase,
          totalEquity: savedBase.totalEquity.some(
            (item) => item.accountId === result.account.id,
          )
            ? savedBase.totalEquity
            : [...savedBase.totalEquity, createdItem],
        };
        savedDraftRef.current = nextSavedBase;
        setSavedDraft(nextSavedBase);
        setSavedInput(getBudgetSnapshot(toBudgetInput(nextSavedBase)));
        remainingStagedAccounts = remainingStagedAccounts.map((entry) =>
          entry.itemId === staged.itemId
            ? { ...entry, createdAccount: result.account }
            : entry,
        );
        setStagedAccounts(remainingStagedAccounts);
        setStepStatus(stepId, "complete");
      }

      if (remainingStagedAccounts.length > 0) {
        activeStepId = refreshStepId;
        setStepStatus(refreshStepId, "active");
        const response = await fetch(
          `/api/months/${encodeURIComponent(monthSlug)}`,
        );
        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              "Accounts were added, but Total Equity could not refresh.",
            ),
          );
        }
        const refreshedBudget = await readApiJson<MonthBudget>(
          response,
          "Could not read the refreshed month budget",
        );
        const createdAccountIds = new Set(
          remainingStagedAccounts.flatMap((entry) =>
            entry.createdAccount ? [entry.createdAccount.id] : [],
          ),
        );
        const refreshedDraftItems = createEditableBudget(refreshedBudget);
        const refreshedItems = refreshedDraftItems.totalEquity.filter(
          (item): item is EditableBudgetItem & { accountId: string } =>
            Boolean(item.accountId && createdAccountIds.has(item.accountId)),
        );
        if (refreshedItems.length !== createdAccountIds.size) {
          throw new Error(
            "One or more new accounts could not be found in the refreshed Total Equity.",
          );
        }

        const refreshedItemsByAccountId = new Map(
          refreshedItems.map((item) => [item.accountId, item]),
        );
        workingDraft = {
          ...workingDraft,
          totalEquity: workingDraft.totalEquity.map((item) => {
            const refreshedItem = item.accountId
              ? refreshedItemsByAccountId.get(item.accountId)
              : undefined;
            return refreshedItem
              ? {
                  ...refreshedItem,
                  id: item.id,
                }
              : item;
          }),
          equityChange: [
            ...workingDraft.equityChange.filter(
              (item) =>
                !item.accountId || !createdAccountIds.has(item.accountId),
            ),
            ...refreshedDraftItems.equityChange.filter(
              (item) => item.accountId && createdAccountIds.has(item.accountId),
            ),
          ],
        };
        setDraft(workingDraft);

        const savedBase = savedDraftRef.current;
        const savedTotalEquity = refreshedItems.map((item) => {
          const draftItem = workingDraft.totalEquity.find(
            (entry) => entry.accountId === item.accountId,
          );
          return {
            ...item,
            id: draftItem?.id ?? item.id,
          };
        });
        const savedEquityChanges = refreshedDraftItems.equityChange.filter(
          (item) => item.accountId && createdAccountIds.has(item.accountId),
        );
        const nextSavedBase: EditableBudget = {
          ...savedBase,
          totalEquity: [
            ...savedBase.totalEquity.filter(
              (item) =>
                !item.accountId || !createdAccountIds.has(item.accountId),
            ),
            ...savedTotalEquity,
          ],
          equityChange: [
            ...savedBase.equityChange.filter(
              (item) =>
                !item.accountId || !createdAccountIds.has(item.accountId),
            ),
            ...savedEquityChanges.map((item) => ({
              ...item,
              id:
                workingDraft.equityChange.find(
                  (entry) => entry.accountId === item.accountId,
                )?.id ?? item.id,
            })),
          ],
        };
        savedDraftRef.current = nextSavedBase;
        setSavedDraft(nextSavedBase);
        setSavedInput(getBudgetSnapshot(toBudgetInput(nextSavedBase)));
        setStagedAccounts([]);
        setStepStatus(refreshStepId, "complete");
      }

      activeStepId = budgetStepId;
      setStepStatus(budgetStepId, "active");
      const input = toBudgetInput(workingDraft);
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
      savedDraftRef.current = workingDraft;
      setSavedDraft(workingDraft);
      setSavedVersion((version) => version + 1);
      setStagedAccounts([]);
      setSavedMessage(
        isCurrentMonth
          ? "Changes saved and account balances synced."
          : "Changes saved.",
      );
      setStepStatus(budgetStepId, "complete");
      setIsProgressDialogOpen(false);
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Could not save this month's budget.";
      setStepStatus(activeStepId, "error", message);
      setError(message);
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
              disabled={isSaving || hasCreatedStagedAccount}
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
              hasUnsavedChanges={
                currentSectionSnapshots[section] !==
                savedSectionSnapshots[section]
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
          onStage={handleEquityAccountStaged}
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
      {hasCreatedStagedAccount && (
        <Alert severity="info">
          An account was created, but the month save is incomplete. Save again
          to finish syncing the month.
        </Alert>
      )}
      <Stack direction="row" spacing={1}>
        <Tooltip title="Reset unsaved changes">
          <span>
            <IconButton
              aria-label="Reset unsaved changes"
              disabled={
                (!isDirty && stagedAccounts.length === 0) ||
                isSaving ||
                hasCreatedStagedAccount
              }
              onClick={cancelChanges}
            >
              <RestartAltIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button
          disabled={!isDirty || isSaving || hasCreatedStagedAccount}
          onClick={cancelChanges}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          disabled={(!isDirty && stagedAccounts.length === 0) || isSaving}
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
      </Stack>
      <Dialog
        aria-labelledby="save-progress-title"
        onClose={() => !isSaving && setIsProgressDialogOpen(false)}
        open={isProgressDialogOpen}
      >
        <DialogTitle id="save-progress-title">Saving month changes</DialogTitle>
        <DialogContent>
          <List>
            {saveSteps.map((step) => (
              <ListItem key={step.id}>
                <ListItemIcon>
                  {step.status === "active" ? (
                    <CircularProgress size={22} />
                  ) : step.status === "complete" ? (
                    <CheckCircleIcon color="success" />
                  ) : step.status === "error" ? (
                    <ErrorIcon color="error" />
                  ) : null}
                </ListItemIcon>
                <ListItemText
                  primary={step.label}
                  secondary={
                    step.error ??
                    (step.status === "pending"
                      ? "Waiting"
                      : step.status === "active"
                        ? "In progress"
                        : step.status === "complete"
                          ? "Complete"
                          : undefined)
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        {!isSaving && (
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setIsProgressDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Stack>
  );
};
