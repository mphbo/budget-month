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
import type { AccountCategory, AccountType } from "../lib/account-types";
import {
  getAccountCategories,
  getDefaultAccountCategory,
  parseAccountCategory,
} from "../lib/account-types";
import type { EditableBudgetItem } from "./DataTable";

export const TotalEquityItemDialog = ({
  open,
  item,
  accountSynced,
  disabled,
  onClose,
  onSave,
}: {
  open: boolean;
  item: EditableBudgetItem | null;
  accountSynced: boolean;
  disabled: boolean;
  onClose: () => void;
  onSave: (item: EditableBudgetItem) => void;
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [category, setCategory] = useState<AccountCategory>(
    getDefaultAccountCategory("asset"),
  );
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(item?.item ?? "");
    setType(item?.accountType ?? "asset");
    setCategory(
      item?.category ?? getDefaultAccountCategory(item?.accountType ?? "asset"),
    );
    setAmount(item?.amount ?? "");
    setError(null);
  }, [item, open]);

  const handleTypeChange = (nextType: string) => {
    if (nextType !== "asset" && nextType !== "liability") {
      return;
    }

    setType(nextType);
    setCategory(getDefaultAccountCategory(nextType));
    const numericAmount = Number(amount);
    if (amount && Number.isFinite(numericAmount)) {
      setAmount(
        (nextType === "liability"
          ? -Math.abs(numericAmount)
          : Math.abs(numericAmount)
        ).toFixed(2),
      );
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (
      !normalizedName ||
      normalizedName.length > 200 ||
      !category.trim() ||
      category.trim().length > 100 ||
      !/^-?\d{1,12}(?:\.\d{1,2})?$/.test(amount)
    ) {
      setError("Enter a name, category, and valid amount.");
      return;
    }

    setError(null);
    onSave({
      id: item?.id ?? crypto.randomUUID(),
      item: normalizedName,
      amount,
      ...(item?.accountId ? { accountId: item.accountId } : {}),
      accountType: type,
      category: parseAccountCategory(category.trim()),
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
        {item ? "Edit Total Equity item" : "Add Total Equity item"}
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
              {getAccountCategories(type, category).map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              disabled={disabled}
              fullWidth
              helperText={
                type === "liability"
                  ? "Liabilities use a negative balance."
                  : undefined
              }
              label="Amount"
              onChange={(event) => setAmount(event.target.value)}
              required
              slotProps={{
                htmlInput: {
                  inputMode: "decimal",
                  max: 999999999999.99,
                  min: type === "asset" ? 0 : -999999999999.99,
                  step: "0.01",
                },
              }}
              type="number"
              value={amount}
            />
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
