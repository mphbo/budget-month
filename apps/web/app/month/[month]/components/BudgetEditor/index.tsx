"use client";

import SaveIcon from "@mui/icons-material/Save";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { AddAccountDialog } from "@/app/components/AddAccountDialog";
import { ResetChanges } from "@/app/components/ResetChanges";
import type { Account, AccountInput } from "@/app/lib/account-types";
import { getApiErrorMessage, readApiJson } from "@/app/lib/api-response";
import type { BudgetSection, MonthBudget } from "@/app/lib/month-types";
import { CashFlow } from "./components/CashFlow";
import { CurrentMonthAlert } from "./components/CurrentMonthAlert";
import { DataTable, type EditableBudgetItem } from "./components/DataTable";
import { SaveProgressDialog } from "./components/SaveProgressDialog";
import { TotalEquityTable } from "./components/TotalEquityTable";
import { sectionTitles } from "./constants";
import {
  createEditableBudget,
  getBudgetSectionSnapshots,
  getBudgetSnapshot,
  getValidationError,
  signedEquityAmount,
  toBudgetInput,
} from "./helpers";
import type {
  EditableBudget,
  SaveStep,
  SaveStepStatus,
  StagedAccount,
} from "./types";

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
        const previousCurrentAmount = signedEquityAmount(
          previous.accountType ??
            (Number(previous.amount) < 0 ? "liability" : "asset"),
          previous.amount,
        );
        const previousAmount =
          previousCurrentAmount - Number(change?.amount ?? 0);
        const adjustedPreviousAmount =
          next?.accountType && next.accountType !== previous.accountType
            ? signedEquityAmount(
                next.accountType,
                String(Math.abs(previousAmount)),
              )
            : previousAmount;
        const nextAmount = next
          ? signedEquityAmount(
              next.accountType ??
                (Number(next.amount) < 0 ? "liability" : "asset"),
              next.amount,
            )
          : 0;
        const nextChange = next
          ? nextAmount - adjustedPreviousAmount
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
      amount: Number(account.amount).toFixed(2),
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
          amount: Number(result.account.amount).toFixed(2),
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
          (
            item: EditableBudgetItem,
          ): item is EditableBudgetItem & { accountId: string } =>
            Boolean(item.accountId && createdAccountIds.has(item.accountId)),
        );
        if (refreshedItems.length !== createdAccountIds.size) {
          throw new Error(
            "One or more new accounts could not be found in the refreshed Total Equity.",
          );
        }

        const refreshedItemsByAccountId = new Map(
          refreshedItems.map(
            (item: EditableBudgetItem & { accountId: string }) => [
              item.accountId,
              item,
            ],
          ),
        );
        workingDraft = {
          ...workingDraft,
          totalEquity: workingDraft.totalEquity.map(
            (item: EditableBudgetItem) => {
              const refreshedItem = item.accountId
                ? refreshedItemsByAccountId.get(item.accountId)
                : undefined;
              return refreshedItem
                ? {
                    ...refreshedItem,
                    id: item.id,
                  }
                : item;
            },
          ),
          equityChange: [
            ...workingDraft.equityChange.filter(
              (item: EditableBudgetItem) =>
                !item.accountId || !createdAccountIds.has(item.accountId),
            ),
            ...refreshedDraftItems.equityChange.filter(
              (item: EditableBudgetItem) =>
                item.accountId && createdAccountIds.has(item.accountId),
            ),
          ],
        };
        setDraft(workingDraft);

        const savedBase = savedDraftRef.current;
        const savedTotalEquity = refreshedItems.map(
          (item: EditableBudgetItem) => {
            const draftItem = workingDraft.totalEquity.find(
              (entry: EditableBudgetItem) => entry.accountId === item.accountId,
            );
            return {
              ...item,
              id: draftItem?.id ?? item.id,
            };
          },
        );
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
      <CashFlow draft={draft} />
      <Grid
        container
        columnSpacing={{ xs: 0, md: 10 }}
        rowSpacing={{ xs: 2, md: 5 }}
      >
        {(Object.keys(sectionTitles) as BudgetSection[]).map((section) => (
          <Grid key={`${section}-${savedVersion}`} size={{ xs: 12, md: 6 }}>
            {section === "totalEquity" ? (
              <TotalEquityTable
                accountSynced={isCurrentMonth}
                addDisabled={isCurrentMonth && (isDirty || isAddingEquityItem)}
                disabled={isSaving || hasCreatedStagedAccount}
                hasUnsavedChanges={
                  currentSectionSnapshots[section] !==
                  savedSectionSnapshots[section]
                }
                items={draft.totalEquity}
                onAddItem={() => setIsAddingEquityItem(true)}
                onChange={(items) => updateSection(section, items)}
                title={sectionTitles[section]}
                titleTooltip={
                  isCurrentMonth
                    ? "This month’s equity balances are synced with Accounts. Edit balances or delete accounts here; liabilities are negative. Type and category changes update the account globally across all months when saved."
                    : isFutureMonth
                      ? "This is a planned equity estimate for a future month. Balance changes do not sync with Accounts, but type and category changes update the account globally across all months when saved."
                      : "This is a historical snapshot. Balance changes do not affect Accounts, but type and category changes update the account globally across all months when saved."
                }
              />
            ) : (
              <DataTable
                disabled={isSaving || hasCreatedStagedAccount}
                hasUnsavedChanges={
                  currentSectionSnapshots[section] !==
                  savedSectionSnapshots[section]
                }
                items={draft[section]}
                onChange={(items) => updateSection(section, items)}
                readOnly={section === "equityChange"}
                showDate={section === "income" || section === "expenses"}
                title={sectionTitles[section]}
                titleTooltip={
                  section === "equityChange"
                    ? "Calculated per item as this month’s Total Equity minus the previous month’s Total Equity. Positive amounts are increases; negative amounts are decreases."
                    : undefined
                }
              />
            )}
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
      <CurrentMonthAlert
        isCurrentMonth={isCurrentMonth}
        isFutureMonth={isFutureMonth}
      />
      {savedMessage && <Alert severity="success">{savedMessage}</Alert>}
      {hasCreatedStagedAccount && (
        <Alert severity="info">
          An account was created, but the month save is incomplete. Save again
          to finish syncing the month.
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <ResetChanges
          disabled={
            (!isDirty && stagedAccounts.length === 0) ||
            isSaving ||
            hasCreatedStagedAccount
          }
          onReset={cancelChanges}
        />
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
      <SaveProgressDialog
        saveSteps={saveSteps}
        isSaving={isSaving}
        open={isProgressDialogOpen}
        onClose={() => setIsProgressDialogOpen(false)}
      />
    </Stack>
  );
};
