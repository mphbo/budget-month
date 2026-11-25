"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import type { AccountCategory, AccountType } from "@/app/lib/account-types";
import {
  EXPENSE_CATEGORIES,
  getAccountCategories,
  getDefaultAccountCategory,
  INCOME_CATEGORIES,
  parseAccountCategory,
} from "@/app/lib/account-types";
import { AmountField } from "@/app/components/AmountField";
import type { EditableBudgetItem } from "./DataTable";

export type BudgetItemDialogSection = "income" | "expenses" | "totalEquity";

export const BudgetItemDialog = ({
  open,
  section,
  item,
  existingNames,
  accountSynced,
  disabled,
  onClose,
  onSave,
}: {
  open: boolean;
  section: BudgetItemDialogSection;
  item: EditableBudgetItem | null;
  existingNames: string[];
  accountSynced: boolean;
  disabled: boolean;
  onClose: () => void;
  onSave: (item: EditableBudgetItem) => void;
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [category, setCategory] = useState<AccountCategory>(
    INCOME_CATEGORIES.other,
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isTotalEquity = section === "totalEquity";

  const categories =
    section === "income"
      ? Object.values(INCOME_CATEGORIES)
      : section === "expenses"
        ? Object.values(EXPENSE_CATEGORIES)
        : getAccountCategories(type, category);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextType = item?.accountType ?? "asset";

    setName(item?.item ?? "");
    setType(nextType);
    setCategory(
      item?.category ??
        (isTotalEquity
          ? getDefaultAccountCategory(nextType)
          : section === "income"
            ? INCOME_CATEGORIES.other
            : EXPENSE_CATEGORIES.other),
    );
    setAmount(item?.amount ?? "");
    setDate(item?.date ?? "");
    setError(null);
  }, [item, open, section]);

  const handleTypeChange = (nextType: string) => {
    if (nextType !== "asset" && nextType !== "liability") {
      return;
    }

    setType(nextType);
    setCategory(getDefaultAccountCategory(nextType));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();

    if (
      !normalizedName ||
      normalizedName.length > 200 ||
      !category.trim() ||
      category.trim().length > 100 ||
      !/^\d{1,12}(?:\.\d{1,2})?$/.test(amount)
    ) {
      setError("Enter a name, category, and valid amount.");
      return;
    }

    if (
      isTotalEquity &&
      existingNames.some(
        (existingName) =>
          existingName.trim().toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setError("Total Equity item names must be unique in this month.");
      return;
    }

    setError(null);

    onSave({
      id: item?.id ?? crypto.randomUUID(),
      item: normalizedName,
      amount,
      ...(item?.accountId ? { accountId: item.accountId } : {}),
      ...(isTotalEquity
        ? {
            accountType: type,
            category: parseAccountCategory(category.trim()),
          }
        : {
            category: parseAccountCategory(category.trim()),
            ...(date ? { date } : {}),
          }),
    });

    onClose();
  };

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      onClose={disabled ? undefined : onClose}
      open={open}
    >
      <DialogTitle>
        {item
          ? `Edit ${isTotalEquity ? "Total Equity" : section} item`
          : `Add ${isTotalEquity ? "Total Equity" : section} item`}
      </DialogTitle>
      <Stack component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              autoFocus
              disabled={disabled || Boolean(item?.accountId && accountSynced)}
              fullWidth
              label="Name"
              onChange={(event) => setName(event.target.value)}
              required
              slotProps={{ htmlInput: { maxLength: 200 } }}
              value={name}
            />

            {isTotalEquity && (
              <TextField
                disabled={disabled}
                fullWidth
                label="Type"
                onChange={(event) => handleTypeChange(event.target.value)}
                required
                select
                value={type}
              >
                <MenuItem value="asset">Asset</MenuItem>
                <MenuItem value="liability">Liability</MenuItem>
              </TextField>
            )}

            <TextField
              disabled={disabled}
              fullWidth
              label="Category"
              onChange={(event) =>
                setCategory(parseAccountCategory(event.target.value))
              }
              required
              select
              value={category}
            >
              {categories.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <AmountField
              disabled={disabled}
              fullWidth
              label="Amount"
              onAmountChange={setAmount}
              required
              value={amount}
            />

            {!isTotalEquity && (
              <TextField
                disabled={disabled}
                fullWidth
                label="Date"
                onChange={(event) => setDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                type="date"
                value={date}
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button disabled={disabled} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={disabled} type="submit" variant="contained">
            {item ? "Save item" : "Add item"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};
