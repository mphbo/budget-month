"use client";

import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddIcon from "@mui/icons-material/Add";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EditIcon from "@mui/icons-material/Edit";
import PaymentsIcon from "@mui/icons-material/Payments";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { Account, AccountInput, AccountType } from "../lib/account-types";
import { AddAccountDialog } from "./AddAccountDialog";

type EditableAccount = Omit<Account, "amount"> & { amount: string };

const toEditableAccount = (account: Account): EditableAccount => ({
  ...account,
  amount: account.amount.toFixed(2),
});

const toAccountInput = (account: EditableAccount): AccountInput => ({
  name: account.name,
  type: account.type,
  category: account.category,
  amount: account.amount,
});

const accountSnapshot = (accounts: AccountInput[]) =>
  JSON.stringify(
    accounts.map((account) => ({
      name: account.name.trim(),
      type: account.type,
      category: account.category.trim(),
      amount: /^\d{1,12}(?:\.\d{1,2})?$/.test(account.amount)
        ? Number(account.amount).toFixed(2)
        : account.amount,
    })),
  );

export const AccountList = ({ accounts }: { accounts: Account[] }) => {
  const [draft, setDraft] = useState(accounts.map(toEditableAccount));
  const [savedAccounts, setSavedAccounts] = useState(
    accounts.map((account) => toAccountInput(toEditableAccount(account))),
  );
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const assets = draft.filter((account) => account.type === "asset");
  const liabilities = draft.filter((account) => account.type === "liability");
  const isDirty =
    accountSnapshot(draft.map(toAccountInput)) !==
    accountSnapshot(savedAccounts);
  const total =
    assets.reduce((sum, account) => sum + (Number(account.amount) || 0), 0) -
    liabilities.reduce(
      (sum, account) => sum + (Number(account.amount) || 0),
      0,
    );

  useEffect(() => {
    if (editingIds.size === 0) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[role='listbox']")) {
        return;
      }

      const editingRow =
        target instanceof Element
          ? target
              .closest("input, [role='combobox']")
              ?.closest("[data-account-row]")
          : null;
      const rowId = editingRow?.getAttribute("data-account-row");

      setEditingIds(
        rowId && editingIds.has(rowId) ? new Set([rowId]) : new Set(),
      );
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
  }, [editingIds]);

  const updateAccount = (id: string, patch: Partial<EditableAccount>) => {
    setDraft((current) =>
      current.map((account) =>
        account.id === id ? { ...account, ...patch } : account,
      ),
    );
    setError(null);
    setSavedMessage(null);
  };

  const addAccount = (account: Account) => {
    const editableAccount = toEditableAccount(account);
    setDraft((current) => [...current, editableAccount]);
    setSavedAccounts((current) => [
      ...current,
      toAccountInput(editableAccount),
    ]);
    setSavedMessage("Account added.");
    setError(null);
  };

  const saveAccounts = async () => {
    const invalidAccount = draft.find(
      (account) =>
        !account.name.trim() ||
        account.name.trim().length > 120 ||
        !account.category.trim() ||
        account.category.trim().length > 100 ||
        !/^\d{1,12}(?:\.\d{1,2})?$/.test(account.amount),
    );

    if (invalidAccount || draft.length > 100) {
      setError(
        draft.length > 100
          ? "You can save up to 100 accounts."
          : "Each account needs a name, category, and valid non-negative amount.",
      );
      setSavedMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const input = draft.map(toAccountInput);
      const response = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: input }),
      });

      if (!response.ok) {
        const result: { error?: string } = await response.json();
        throw new Error(result.error ?? "Could not save your accounts.");
      }

      setSavedAccounts(input);
      setSavedMessage("Account changes saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your accounts.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderAccount = (account: EditableAccount, index: number) => {
    const isEditing = editingIds.has(account.id);

    return (
      <ListItem
        data-account-row={account.id}
        disablePadding
        key={account.id}
        sx={{ py: 1 }}
      >
        <Box sx={{ display: "flex", gap: 1.5, width: "100%", minWidth: 0 }}>
          <ListItemIcon sx={{ minWidth: 36, alignSelf: "center" }}>
            {account.type === "asset" ? <AttachMoneyIcon /> : <PaymentsIcon />}
          </ListItemIcon>
          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <>
                <TextField
                  aria-label={`Account name ${index + 1}`}
                  disabled={isSaving}
                  fullWidth
                  label="Name"
                  onChange={(event) =>
                    updateAccount(account.id, { name: event.target.value })
                  }
                  size="small"
                  value={account.name}
                />
                <TextField
                  aria-label={`Account type ${index + 1}`}
                  disabled={isSaving}
                  fullWidth
                  label="Type"
                  onChange={(event) => {
                    if (
                      event.target.value === "asset" ||
                      event.target.value === "liability"
                    ) {
                      updateAccount(account.id, {
                        type: event.target.value as AccountType,
                      });
                    }
                  }}
                  select
                  size="small"
                  value={account.type}
                >
                  <MenuItem value="asset">Asset</MenuItem>
                  <MenuItem value="liability">Liability</MenuItem>
                </TextField>
                <TextField
                  aria-label={`Account category ${index + 1}`}
                  disabled={isSaving}
                  fullWidth
                  label="Category"
                  onChange={(event) =>
                    updateAccount(account.id, { category: event.target.value })
                  }
                  size="small"
                  value={account.category}
                />
                <TextField
                  aria-label={`Account amount ${index + 1}`}
                  disabled={isSaving}
                  fullWidth
                  label="Amount"
                  onChange={(event) =>
                    updateAccount(account.id, { amount: event.target.value })
                  }
                  size="small"
                  slotProps={{
                    htmlInput: {
                      inputMode: "decimal",
                      max: 999999999999.99,
                      min: 0,
                      step: "0.01",
                    },
                  }}
                  type="number"
                  value={account.amount}
                />
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  paddingRight: "60px",
                }}
              >
                <ListItemText
                  primary={account.name}
                  secondary={`${account.category} · ${account.type}`}
                />
                <Typography>${Number(account.amount).toFixed(2)}</Typography>
              </Box>
            )}
          </Stack>
          {!isEditing && (
            <IconButton
              aria-label={`Edit ${account.name}`}
              disabled={isSaving}
              onClick={() =>
                setEditingIds((current) => new Set(current).add(account.id))
              }
              size="small"
              sx={{ alignSelf: "center" }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            aria-label={`Remove ${account.name}`}
            disabled={isSaving}
            onClick={() => {
              setDraft((current) =>
                current.filter((entry) => entry.id !== account.id),
              );
              setEditingIds((current) => {
                const next = new Set(current);
                next.delete(account.id);
                return next;
              });
              setSavedMessage(null);
            }}
            size="small"
            sx={{ alignSelf: "center" }}
          >
            x
          </IconButton>
        </Box>
      </ListItem>
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 520,
        bgcolor: "background.paper",
        height: "100%",
        p: 4,
      }}
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        {savedMessage && <Alert severity="success">{savedMessage}</Alert>}
        <Typography variant="h4">Assets</Typography>
        <List>
          {assets.map((account, index) => renderAccount(account, index))}
          {assets.length === 0 && (
            <ListItem>
              <ListItemText primary="No assets yet" />
            </ListItem>
          )}
        </List>
        <Divider />
        <Typography variant="h4">Liabilities</Typography>
        <List>
          {liabilities.map((account, index) => renderAccount(account, index))}
          {liabilities.length === 0 && (
            <ListItem>
              <ListItemText primary="No liabilities yet" />
            </ListItem>
          )}
        </List>
        <Divider />
        <ListItem disablePadding sx={{ marginBottom: "20px" }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <AccountBalanceIcon />
          </ListItemIcon>
          <ListItemText primary="Net total" />
          <Typography>${total.toFixed(2)}</Typography>
        </ListItem>
        <Stack direction="row" spacing={1}>
          <Button
            disabled={isSaving}
            onClick={() => setIsAdding(true)}
            startIcon={<AddIcon />}
            variant="outlined"
          >
            Add account
          </Button>
          <Button
            disabled={!isDirty || isSaving}
            onClick={() => void saveAccounts()}
            variant="contained"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </Stack>
      </Stack>
      <AddAccountDialog
        onClose={() => setIsAdding(false)}
        onCreated={addAccount}
        open={isAdding}
      />
    </Box>
  );
};
